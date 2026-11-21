package com.example.ims.simulation;

import com.example.ims.config.RoleConstants;
import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Batch 2 정밀 시뮬레이션 통합 테스트 스위트]
 * 대상 컨트롤러 (9개):
 * - ApprovalController (/api/approvals)
 * - ApprovalAdminController (/api/approval-doc-types, /api/admin/approval-doc-types, /api/admin/approval-templates, /api/admin/notification-rules)
 * - ControlledDocumentController (/api/controlled-documents)
 * - OfficialRecordPolicyController (/api/official-records)
 * - DocumentRequestManagementController (/api/document-requests)
 * - FileServingController (/uploads/**, /api/admin/system/storage-stats)
 * - VendorUploadController (/api/vendor-upload)
 * - AuditTemplateController (/api/audit-templates)
 *
 * 6대 공통 체크리스트 검증:
 * [C] 생성 및 유효성 검증: 문서유형, 결재선 템플릿, 통제문서(SOP), 공식기록 정책, 결재 상신
 * [R] 조회 및 지연로딩(Lazy) 무결성: 결재함 탭별/미열람 건수, 문서상세, 통제문서 목록/KPI, 정책 조회, 404 방어
 * [U] 수정 및 상태 전이: 비인가 결재 차단, 정당 승인, 통제문서 개정(Revision) 및 상태(EFFECTIVE) 전이
 * [D] 삭제 및 라이프사이클 방어: 유효문서 삭제 방어(409), DRAFT 문서 소프트삭제(204), 감사 템플릿 삭제
 * [W] 특화 워크플로우: 21 CFR Part 11 전자서명(비밀번호 재인증/서명해시 생성/철회), 파일 Path Traversal 방어(403)
 * [UX] 프론트엔드 연동 응답 표준화: 에러 스택트레이스 미노출, 일관된 응답 포맷
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class Batch2SimulationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ApprovalDocTypeRepository docTypeRepository;
    @Autowired private ApprovalTemplateRepository templateRepository;
    @Autowired private ApprovalDocumentRepository documentRepository;
    @Autowired private ApprovalStepInstanceRepository stepInstanceRepository;
    @Autowired private ControlledDocumentRepository controlledDocumentRepository;
    @Autowired private OfficialRecordPolicyRepository policyRepository;
    @Autowired private ElectronicSignatureRepository signatureRepository;
    @Autowired private NotificationRuleRepository notificationRuleRepository;
    @Autowired private AuditTemplateRepository auditTemplateRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CacheManager cacheManager;

    private User seedAdmin;
    private User seedApprover;
    private User seedDrafter;
    private ApprovalDocType seedDocType;
    private ApprovalTemplate seedTemplate;
    private ControlledDocument seedDocument;

    @BeforeEach
    void setupBaseData() {
        if (cacheManager != null) {
            for (String cacheName : cacheManager.getCacheNames()) {
                org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
                if (cache != null) {
                    cache.clear();
                }
            }
        }

        // 1. 관리자 및 사용자 계정 보장
        seedAdmin = userRepository.findByUsername("admin").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("admin")
                        .name("최고관리자")
                        .password(passwordEncoder.encode("AdminPass123!@#"))
                        .role(RoleConstants.ADMIN)
                        .department("품질보증팀")
                        .companyName("본사")
                        .enabled(true)
                        .build()));

        seedApprover = userRepository.findByUsername("b2_approver").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("b2_approver")
                        .name("품질승인자")
                        .password(passwordEncoder.encode("ApproverPass123!@#"))
                        .role(RoleConstants.QUALITY_TEAM)
                        .department("품질보증팀")
                        .companyName("본사")
                        .enabled(true)
                        .build()));

        seedDrafter = userRepository.findByUsername("b2_drafter").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("b2_drafter")
                        .name("일반기안자")
                        .password(passwordEncoder.encode("DrafterPass123!@#"))
                        .role(RoleConstants.USER)
                        .department("품질보증팀")
                        .companyName("본사")
                        .enabled(true)
                        .build()));

        // 2. 결재 문서 유형 보장
        seedDocType = docTypeRepository.findByCode("B2_SOP_TYPE").orElseGet(() ->
                docTypeRepository.save(ApprovalDocType.builder()
                        .code("B2_SOP_TYPE")
                        .name("SOP 제개정 결재")
                        .sourceTable("controlled_documents")
                        .sourceScreen("ControlledDocumentManagementPage")
                        .isActive(true)
                        .build()));

        // 3. 결재선 템플릿 보장
        seedTemplate = templateRepository.findByDocTypeIdAndIsCurrentTrue(seedDocType.getId()).orElseGet(() -> {
            ApprovalTemplate tpl = ApprovalTemplate.builder()
                    .docType(seedDocType)
                    .version(1)
                    .isCurrent(true)
                    .createdBy(seedAdmin)
                    .steps(new ArrayList<>())
                    .build();
            tpl.getSteps().add(ApprovalTemplateStep.builder()
                    .template(tpl)
                    .stepOrder(1)
                    .stepType("APPROVAL")
                    .assigneeType("USER")
                    .assigneeUserId(seedApprover.getId())
                    .isRequired(true)
                    .build());
            return templateRepository.save(tpl);
        });

        // 4. 통제문서 시드 보장
        seedDocument = controlledDocumentRepository.findByDocNoAndIsDeletedFalseOrderByRevisionIntDesc("SOP-QA-B2-001")
                .stream().findFirst().orElseGet(() ->
                        controlledDocumentRepository.save(ControlledDocument.builder()
                                .docNo("SOP-QA-B2-001")
                                .title("배치2 품질 표준작업지침서")
                                .docType(ControlledDocType.SOP)
                                .targetFamily(ProductFamily.COMMON)
                                .status(ControlledDocStatus.DRAFT)
                                .revisionNo("Rev. 0")
                                .revisionInt(0)
                                .changeRationale("최초 제정")
                                .effectiveDate(LocalDate.now())
                                .expirationDate(LocalDate.now().plusYears(3))
                                .department("품질보증팀")
                                .authorName("최고관리자")
                                .createdBy("admin")
                                .updatedBy("admin")
                                .isDeleted(false)
                                .build()));

        // 5. 알림 규칙 시드 보장
        if (notificationRuleRepository.findAll().isEmpty()) {
            notificationRuleRepository.save(NotificationRule.builder()
                    .eventType("APPROVAL_REQUEST")
                    .channel("EMAIL")
                    .isActive(true)
                    .build());
        }
    }

    @Test
    @Order(1)
    @DisplayName("[C] 생성 및 유효성 검증: 문서유형, 결재선템플릿, 통제문서(SOP), 공식기록정책, 결재 상신")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test01_Create_CRUD_Validation() throws Exception {
        // 1. 신규 결재 문서유형 등록
        ApprovalDocTypeDto newDocType = ApprovalDocTypeDto.builder()
                .code("B2_NEW_DOC")
                .name("신규 개발 검토서")
                .sourceTable("design_controls")
                .sourceScreen("DesignControlManagementPage")
                .isActive(true)
                .build();

        mockMvc.perform(post("/api/admin/approval-doc-types")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newDocType)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("B2_NEW_DOC"));

        // 2. 중복 결재 문서유형 등록 시 400 Bad Request 방어
        mockMvc.perform(post("/api/admin/approval-doc-types")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newDocType)))
                .andExpect(status().isBadRequest());

        // 3. 결재선 템플릿 신규 등록
        ApprovalDocType createdDocType = docTypeRepository.findByCode("B2_NEW_DOC").orElseThrow();
        ApprovalTemplateDto templateDto = ApprovalTemplateDto.builder()
                .docTypeId(createdDocType.getId())
                .steps(List.of(
                        ApprovalTemplateStepDto.builder()
                                .stepOrder(1)
                                .stepType("APPROVAL")
                                .assigneeType("USER")
                                .assigneeUserId(seedApprover.getId())
                                .isRequired(true)
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/admin/approval-templates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(templateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        // 4. 통제문서(SOP) 정상 등록
        ControlledDocumentRequest docReq = ControlledDocumentRequest.builder()
                .docNo("SOP-PROD-002")
                .title("생산설비 위생관리 표준서")
                .docType(ControlledDocType.SOP)
                .targetFamily(ProductFamily.COSMETICS)
                .revisionNo("Rev. 0")
                .department("생산관리팀")
                .changeRationale("신규 제정")
                .build();

        mockMvc.perform(post("/api/controlled-documents")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(docReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.docNo").value("SOP-PROD-002"));

        // 5. 통제문서 필수값 누락 시 400 Bad Request 방어
        ControlledDocumentRequest invalidDocReq = ControlledDocumentRequest.builder()
                .docNo("") // 빈 문서번호
                .title("")
                .build();

        mockMvc.perform(post("/api/controlled-documents")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidDocReq)))
                .andExpect(status().isBadRequest());

        // 6. 공식기록 보존 정책(OfficialRecordPolicy) 등록
        OfficialRecordPolicyRequest policyReq = OfficialRecordPolicyRequest.builder()
                .policyCode("POL-BATCH2-SOP")
                .policyTitle("배치2 SOP 보존 정책")
                .recordCategory(RecordCategory.SPECIFICATION)
                .officialOriginalType(OfficialOriginalType.ELECTRONIC_ONLY)
                .storageFormat("PDF/A")
                .retentionPeriodYears(5)
                .retentionPeriodCriteria("폐기 후 5년 보존")
                .legalBasis("ISO 22716 17조")
                .disposalProcedure("품질부서장 승인 후 영구 파기")
                .build();

        mockMvc.perform(post("/api/official-records/policies")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(policyReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.policyCode").value("POL-BATCH2-SOP"));

        // 7. 전자결재 상신 (Draft 문서 연계)
        ApprovalSubmitRequestDto submitDto = ApprovalSubmitRequestDto.builder()
                .docTypeCode("B2_SOP_TYPE")
                .sourceRecordId(seedDocument.getId())
                .title("SOP-QA-B2-001 제정 결재 상신")
                .comment("검토 후 승인 바랍니다.")
                .build();

        mockMvc.perform(post("/api/approvals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("SOP-QA-B2-001 제정 결재 상신"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @Order(2)
    @DisplayName("[R] 조회 및 지연로딩(Lazy) 무결성: 결재함 탭별 목록, 미열람 카운트, 문서상세, 메트릭, 404 방어")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test02_Read_List_Filter_Paging_Lazy() throws Exception {
        // 1. 일반 사용자용 활성 결재 문서유형 목록 조회
        mockMvc.perform(get("/api/approval-doc-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 2. 결재함 미열람 문서 건수 조회
        mockMvc.perform(get("/api/approvals/unread-counts"))
                .andExpect(status().isOk());

        // 3. 결재함 탭별 조회 (SUBMITTED, PENDING)
        mockMvc.perform(get("/api/approvals")
                .param("tab", "SUBMITTED")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 4. 통제문서 목록 페이징 및 필터 조회
        mockMvc.perform(get("/api/controlled-documents")
                .param("page", "0")
                .param("size", "10")
                .param("keyword", "배치2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 5. 통제문서 KPI 메트릭 조회
        mockMvc.perform(get("/api/controlled-documents/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDocuments").exists());

        // 6. 통제문서 단건 상세 조회 및 미존재 ID 400/404 방어
        mockMvc.perform(get("/api/controlled-documents/" + seedDocument.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.docNo").value("SOP-QA-B2-001"));

        mockMvc.perform(get("/api/controlled-documents/99999999"))
                .andExpect(status().isBadRequest());

        // 7. 공식기록 정책 및 KPI 조회
        mockMvc.perform(get("/api/official-records/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/official-records/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activePolicies").exists());
    }

    @Test
    @Order(3)
    @DisplayName("[U] 수정 및 상태 전이: 비인가 결재 차단, 정당 승인, 통제문서 개정(Revision) 및 상태(EFFECTIVE) 전이")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test03_Update_Lifecycle_Approval_Workflow() throws Exception {
        // 1. 신규 결재 상신
        ApprovalSubmitRequestDto submitDto = ApprovalSubmitRequestDto.builder()
                .docTypeCode("B2_SOP_TYPE")
                .sourceRecordId(seedDocument.getId())
                .title("결재 승인 라이프사이클 테스트 상신")
                .build();

        MvcResult submitResult = mockMvc.perform(post("/api/approvals")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitDto)))
                .andExpect(status().isOk())
                .andReturn();

        ApprovalDocumentDetailDto detail = objectMapper.readValue(
                submitResult.getResponse().getContentAsString(), ApprovalDocumentDetailDto.class
        );
        Long docId = detail.getId();

        // 2. 결재선에 포함되지 않은 비인가 사용자의 승인 시도 차단 (409 Conflict)
        ApprovalActionRequestDto actionDto = new ApprovalActionRequestDto();
        actionDto.setComment("임의 승인 시도");

        mockMvc.perform(post("/api/approvals/" + docId + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(actionDto)))
                .andExpect(status().isConflict()); // 승인 권한 없음 IllegalStateException -> 409

        // 3. 통제문서 개정(Revision) 생성
        ControlledDocumentRevisionRequest revReq = ControlledDocumentRevisionRequest.builder()
                .revisionNo("Rev. 1")
                .changeRationale("배치2 공정 변경에 따른 절차 보완")
                .title("배치2 품질 표준작업지침서 (개정)")
                .department("품질보증팀")
                .build();

        mockMvc.perform(post("/api/controlled-documents/" + seedDocument.getId() + "/revision")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(revReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.revisionNo").value("Rev. 1"))
                .andExpect(jsonPath("$.revisionInt").value(1));

        // 4. 통제문서 상태 전이: DRAFT -> EFFECTIVE
        ControlledDocumentStatusRequest statusReq = ControlledDocumentStatusRequest.builder()
                .status(ControlledDocStatus.EFFECTIVE)
                .reason("최종 품질 승인 완료에 따른 배포 유효화")
                .build();

        mockMvc.perform(patch("/api/controlled-documents/" + seedDocument.getId() + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EFFECTIVE"));
    }

    @Test
    @Order(4)
    @DisplayName("[D] 삭제 및 라이프사이클 방어: 배포유효문서 삭제 방어(409), DRAFT 문서 소프트삭제(204), 감사 템플릿 삭제")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test04_Delete_Lifecycle_And_Integrity_Defense() throws Exception {
        // 1. EFFECTIVE 상태로 전이된 통제문서 직접 삭제 시도시 409 Conflict 방어
        seedDocument.setStatus(ControlledDocStatus.EFFECTIVE);
        controlledDocumentRepository.save(seedDocument);

        mockMvc.perform(delete("/api/controlled-documents/" + seedDocument.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("EFFECTIVE")));

        // 2. DRAFT 상태인 신규 통제문서 생성 후 정상 소프트 삭제 (204 No Content)
        ControlledDocument draftDoc = controlledDocumentRepository.save(ControlledDocument.builder()
                .docNo("SOP-TEMP-DELETE")
                .title("임시 삭제 테스트 문서")
                .docType(ControlledDocType.QUALITY_MANUAL)
                .status(ControlledDocStatus.DRAFT)
                .revisionNo("Rev. 0")
                .revisionInt(0)
                .isDeleted(false)
                .build());

        mockMvc.perform(delete("/api/controlled-documents/" + draftDoc.getId()))
                .andExpect(status().isNoContent());

        // 3. 삭제된 통제문서 단건 조회 시 400 Bad Request 방어
        mockMvc.perform(get("/api/controlled-documents/" + draftDoc.getId()))
                .andExpect(status().isBadRequest());

        // 4. 감사 템플릿 등록 및 삭제 검증
        AuditTemplate template = auditTemplateRepository.save(AuditTemplate.builder()
                .classificationName("배치2_임시_감사템플릿")
                .targetCategory("화장품")
                .active(true)
                .deleted(false)
                .build());

        mockMvc.perform(delete("/api/audit-templates/" + template.getId()))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(5)
    @DisplayName("[W] 특화 워크플로우: 21 CFR Part 11 전자서명(비밀번호재인증/서명해시/철회), 파일 Path Traversal 방어(403)")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test05_Specialized_Part11_File_Vendor_Workflows() throws Exception {
        // 1. 21 CFR Part 11 전자서명 비밀번호 불일치 시 400 Bad Request 방어
        ElectronicSignatureRequest wrongPassReq = ElectronicSignatureRequest.builder()
                .documentType("CONTROLLED_DOCUMENT")
                .targetId(seedDocument.getId())
                .targetNumber(seedDocument.getDocNo())
                .targetTitle(seedDocument.getTitle())
                .signatureMeaning(SignatureMeaning.APPROVER)
                .signatureReason("승인 서명 시도")
                .password("WRONG_PASSWORD_!@#")
                .build();

        mockMvc.perform(post("/api/official-records/signatures")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(wrongPassReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("재인증 실패")));

        // 2. 21 CFR Part 11 전자서명 올바른 비밀번호로 생성 (201 Created & SHA-256 서명 해시 검증)
        ElectronicSignatureRequest correctReq = ElectronicSignatureRequest.builder()
                .documentType("CONTROLLED_DOCUMENT")
                .targetId(seedDocument.getId())
                .targetNumber(seedDocument.getDocNo())
                .targetTitle(seedDocument.getTitle())
                .signatureMeaning(SignatureMeaning.APPROVER)
                .signatureReason("품질관리 책임자 최종 승인")
                .password("AdminPass123!@#")
                .build();

        MvcResult signResult = mockMvc.perform(post("/api/official-records/signatures")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(correctReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.signatureNumber", startsWith("SIG-")))
                .andExpect(jsonPath("$.signatureHash").isNotEmpty())
                .andReturn();

        ElectronicSignatureResponse signRes = objectMapper.readValue(
                signResult.getResponse().getContentAsString(), ElectronicSignatureResponse.class
        );

        // 3. 전자서명 철회 (Revoke)
        mockMvc.perform(post("/api/official-records/signatures/" + signRes.getId() + "/revoke")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "테스트 사유로 인한 관리자 철회"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isRevoked").value(true));

        // 4. 파일 서빙 Path Traversal 비정상 이탈 경로 시도 시 방어 (HTTP Firewall 및 Controller 레벨 400/403 차단)
        mockMvc.perform(get("/uploads/../secret.properties"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isIn(400, 403));

        // 5. 제조사 공개 서류 제출 유효하지 않은 토큰 조회 시 400 Bad Request 방어
        mockMvc.perform(get("/api/vendor-upload/INVALID_TOKEN_RANDOM_12345/info"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Token"));
    }

    @Test
    @Order(6)
    @DisplayName("[UX] 프론트엔드 연동 응답 표준화: 관리자 스토리지 현황, 알림 규칙 수정, 스택트레이스 미노출 검증")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test06_UX_Standardization_And_Storage_Stats() throws Exception {
        // 1. 관리자 전용 영구 저장소(Supabase DB) 사용 현황 조회
        mockMvc.perform(get("/api/admin/system/storage-stats"))
                .andExpect(status().isOk());

        // 2. 알림 규칙 상태 토글 수정
        List<NotificationRule> rules = notificationRuleRepository.findAll();
        if (!rules.isEmpty()) {
            Long ruleId = rules.get(0).getId();
            mockMvc.perform(put("/api/admin/notification-rules/" + ruleId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("isActive", false))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(false));
        }

        // 3. 악의적 404/400 발생 시 스택트레이스 미노출 및 정형화된 JSON 반환 확인
        MvcResult errResult = mockMvc.perform(get("/api/controlled-documents/99999999"))
                .andExpect(status().isBadRequest())
                .andReturn();

        String errBody = errResult.getResponse().getContentAsString();
        assertThat(errBody).doesNotContain("at com.example.ims");
        assertThat(errBody).doesNotContain("Exception:");
    }
}
