package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.CustomDocumentTypeRepository;
import com.example.ims.repository.DocumentRequirementRepository;
import com.example.ims.repository.DocumentRequestLogRepository;
import com.example.ims.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DocumentRequestService {

    private static final Logger log = LoggerFactory.getLogger(DocumentRequestService.class);

    private final DocumentRequirementRepository requirementRepository;
    private final DocumentRequestLogRepository requestLogRepository;
    private final CustomDocumentTypeRepository customDocumentTypeRepository;
    private final ProductRepository productRepository;
    private final EmailService emailService;

    public DocumentRequestService(DocumentRequirementRepository requirementRepository,
                                   DocumentRequestLogRepository requestLogRepository,
                                   CustomDocumentTypeRepository customDocumentTypeRepository,
                                   ProductRepository productRepository,
                                   EmailService emailService) {
        this.requirementRepository = requirementRepository;
        this.requestLogRepository = requestLogRepository;
        this.customDocumentTypeRepository = customDocumentTypeRepository;
        this.productRepository = productRepository;
        this.emailService = emailService;
    }

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * 신규 마스터 제품 등록 시 기본 4종 필수서류 요구조건을 자동으로 생성합니다.
     */
    @Transactional
    public void initializeMasterProductRequirements(Product product) {
        if (product == null || !product.isMaster()) {
            return;
        }

        // 기본 4종 Enum 순회 등록
        for (DocumentEnumType type : DocumentEnumType.values()) {
            Optional<DocumentRequirement> existing = requirementRepository
                    .findByProductIdAndDocumentEnumType(product.getId(), type);
            if (existing.isEmpty()) {
                DocumentRequirement req = DocumentRequirement.builder()
                        .productId(product.getId())
                        .documentEnumType(type)
                        .status(DocumentStatus.PENDING)
                        .build();
                requirementRepository.save(req);
                log.info("[DOCUMENT] Auto created default product requirement: productId={}, docType={}", product.getId(), type);
            }
        }

        // 품목 범위의 커스텀 추가 서류가 등록되어 있다면 이 또한 자동 생성
        List<CustomDocumentType> customTypes = customDocumentTypeRepository.findByIsActiveTrue();
        for (CustomDocumentType customType : customTypes) {
            if (customType.getScope() == DocumentScope.PRODUCT) {
                Optional<DocumentRequirement> existingCustom = requirementRepository
                        .findByProductIdAndCustomDocumentTypeId(product.getId(), customType.getId());
                if (existingCustom.isEmpty()) {
                    DocumentRequirement req = DocumentRequirement.builder()
                            .productId(product.getId())
                            .customDocumentTypeId(customType.getId())
                            .status(DocumentStatus.PENDING)
                            .build();
                    requirementRepository.save(req);
                    log.info("[DOCUMENT] Auto created custom product requirement: productId={}, customTypeId={}", product.getId(), customType.getId());
                }
            }
        }
    }

    /**
     * 신규 커스텀 서류 종류 등록 시, 스키마/Scope에 맞게 기존 품목 또는 제조사에 해당 서류 요구조건을 자동 생성해 줍니다.
     */
    @Transactional
    public void initializeCustomRequirementsForAllTargets(CustomDocumentType customType) {
        if (customType == null || !customType.getIsActive()) {
            return;
        }

        if (customType.getScope() == DocumentScope.PRODUCT) {
            // isMaster = true 인 모든 제품을 구함
            List<Product> masterProducts = productRepository.findByIsMasterTrue();
            for (Product prod : masterProducts) {
                Optional<DocumentRequirement> existing = requirementRepository
                        .findByProductIdAndCustomDocumentTypeId(prod.getId(), customType.getId());
                if (existing.isEmpty()) {
                    DocumentRequirement req = DocumentRequirement.builder()
                            .productId(prod.getId())
                            .customDocumentTypeId(customType.getId())
                            .status(DocumentStatus.PENDING)
                            .build();
                    requirementRepository.save(req);
                }
            }
        } else if (customType.getScope() == DocumentScope.MANUFACTURER) {
            // 마스터 품목이 1개 이상 연결되어 있는 활성 제조사만 조회
            List<Long> activeManufacturerIds = productRepository.findActiveManufacturerIdsWithMasterProducts();
            for (Long mId : activeManufacturerIds) {
                Optional<DocumentRequirement> existing = requirementRepository
                        .findByManufacturerIdAndCustomDocumentTypeId(mId, customType.getId());
                if (existing.isEmpty()) {
                    DocumentRequirement req = DocumentRequirement.builder()
                            .manufacturerId(mId)
                            .customDocumentTypeId(customType.getId())
                            .status(DocumentStatus.PENDING)
                            .build();
                    requirementRepository.save(req);
                }
            }
        }
    }

    /**
     * 필수 서류 요구사항에 맞게 벤더에 이메일 요청을 발송하고 로그(토큰)를 기록합니다.
     */
    @Transactional
    public void sendEmailRequest(DocumentRequirement req, String emailAddress) throws Exception {
        if (req == null || emailAddress == null || emailAddress.trim().isEmpty()) {
            throw new IllegalArgumentException("요청 정보 또는 수신처 이메일이 올바르지 않습니다.");
        }

        // 비즈니스 정합성 2차 방어선: scope=PRODUCT인 경우 product.isMaster = true 여부 검증
        if (req.getProductId() != null) {
            Product prod = productRepository.findById(req.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 품목입니다."));
            if (!prod.isMaster()) {
                throw new IllegalStateException("정합성 위반: 마스터 제품(isMaster=true)에 대해서만 서류를 요청할 수 있습니다.");
            }
        }

        String docName = getDocumentName(req);
        String targetName = getTargetName(req);

        // 1. UUID 보안 링크 토큰 생성 (14일 만료)
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(14);

        DocumentRequestLog logEntity = DocumentRequestLog.builder()
                .requirementId(req.getId())
                .requestedAt(LocalDateTime.now())
                .uploadToken(token)
                .tokenExpiresAt(expiresAt)
                .emailSentTo(emailAddress)
                .reminderCount(0)
                .build();
        requestLogRepository.save(logEntity);

        // 2. 이메일 템플릿 본문 작성
        String uploadLink = frontendUrl + "/vendor-upload/" + token;
        String subject = "[QMS 필수서류 제출 요청] " + targetName + " - " + docName;
        String body = "<html>" +
                "<body>" +
                "  <h2>QMS 필수 품질서류 자동 요청 안내</h2>" +
                "  <p>안녕하세요. <b>" + targetName + "</b> 관련 품질서류 보완 및 제출을 요청드립니다.</p>" +
                "  <p>제출 대상 서류: <b>" + docName + "</b></p>" +
                "  <p>아래 안전 링크를 클릭하여 로그인 없이 직접 관련 PDF/이미지 파일을 제출할 수 있습니다.</p>" +
                "  <p><a href=\"" + uploadLink + "\" style=\"display: inline-block; padding: 12px 24px; color: white; background-color: #003366; text-decoration: none; border-radius: 6px; font-weight: bold;\">📂 품질 서류 제출하러 가기</a></p>" +
                "  <p>링크가 클릭되지 않는 경우 아래 주소를 복사하여 브라우저에 붙여넣어 주세요.</p>" +
                "  <p>" + uploadLink + "</p>" +
                "  <p>※ 본 링크는 발송일로부터 14일 동안만 유효합니다. (만료일시: " + expiresAt.toString().substring(0, 16).replace("T", " ") + ")</p>" +
                "</body>" +
                "</html>";

        // EmailService의 공용 비동기 발송 활용
        emailService.sendCustomEmail(emailAddress, subject, body);

        // 3. 요구사항 상태 변경
        req.setStatus(DocumentStatus.REQUESTED);
        requirementRepository.save(req);
    }

    /**
     * 벤더 업로드용 토큰의 유효성을 정합성 있게 검증합니다.
     */
    @Transactional(readOnly = true)
    public DocumentRequestLog verifyUploadToken(String token) {
        DocumentRequestLog logEntity = requestLogRepository.findByUploadToken(token)
                .orElseThrow(() -> new IllegalArgumentException("요효하지 않은 링크이거나 존재하지 않는 토큰입니다."));

        if (logEntity.getUploadedAt() != null) {
            throw new IllegalStateException("이미 서류 업로드가 완료된 1회성 만료 링크입니다.");
        }

        if (logEntity.getTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("해당 제출 링크가 만료되었습니다. 담당자에게 재발송을 요청해 주십시오.");
        }

        return logEntity;
    }

    /**
     * 제조사 셀프 업로드 제출 완료 후 후처리 및 주기 예산 계산을 수행합니다.
     */
    @Transactional
    public void fulfillDocumentRequest(String token, String uploadedFileUrl) {
        // 1. 토큰 유효성 2차 방어선 검증
        DocumentRequestLog logEntity = verifyUploadToken(token);

        // 2. 제출 정보 기록
        logEntity.setUploadedAt(LocalDateTime.now());
        logEntity.setUploadedFileUrl(uploadedFileUrl);
        requestLogRepository.save(logEntity);

        // 3. 요구사항 갱신 및 주기 연산
        DocumentRequirement req = requirementRepository.findById(logEntity.getRequirementId())
                .orElseThrow(() -> new IllegalStateException("연동된 필수 서류 정보를 찾을 수 없습니다."));

        req.setStatus(DocumentStatus.FULFILLED);
        req.setLastReceivedDate(LocalDate.now());

        // 주기 계산 분기
        RecurrenceType recType = getRecurrenceType(req);
        if (recType == RecurrenceType.ONE_TIME) {
            req.setNextDueDate(null); // 최초 1회만 제출하는 항목이므로 완료 후 스케줄러에서 영구 제외
        } else {
            int periodMonths = getPeriodMonths(req);
            req.setNextDueDate(LocalDate.now().plusMonths(periodMonths));
        }

        requirementRepository.save(req);
        log.info("[DOCUMENT] Fulfill requirement successfully: id={}, status=FULFILLED, nextDueDate={}", req.getId(), req.getNextDueDate());
    }

    // --- 헬퍼 유틸리티 메서드 ---

    public String getDocumentName(DocumentRequirement req) {
        if (req.getDocumentEnumType() != null) {
            switch (req.getDocumentEnumType()) {
                case MSDS: return "MSDS (물질안전보건자료)";
                case MANUFACTURING_PROCESS_CHART: return "제조공정도";
                case PRODUCT_STANDARD: return "제품표준서";
                case STABILITY_TEST: return "안정성테스트보고서";
            }
        } else if (req.getCustomDocumentTypeId() != null && req.getCustomDocumentType() != null) {
            return req.getCustomDocumentType().getName();
        }
        return "미지정 서류";
    }

    private String getTargetName(DocumentRequirement req) {
        if (req.getProduct() != null) {
            return req.getProduct().getProductName();
        } else if (req.getManufacturer() != null) {
            return req.getManufacturer().getName();
        }
        return "미지정 대상";
    }

    private RecurrenceType getRecurrenceType(DocumentRequirement req) {
        if (req.getDocumentEnumType() != null) {
            return req.getDocumentEnumType().getRecurrenceType();
        } else if (req.getCustomDocumentType() != null) {
            return RecurrenceType.valueOf(req.getCustomDocumentType().getRecurrenceType());
        }
        return RecurrenceType.ONE_TIME;
    }

    private int getPeriodMonths(DocumentRequirement req) {
        if (req.getDocumentEnumType() != null) {
            return req.getDocumentEnumType().getPeriodMonths();
        } else if (req.getCustomDocumentType() != null) {
            return req.getCustomDocumentType().getPeriodMonths();
        }
        return 12;
    }
}
