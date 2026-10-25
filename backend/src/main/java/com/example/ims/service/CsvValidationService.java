package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.CsvDefectRecordRepository;
import com.example.ims.repository.CsvGoLiveApprovalRepository;
import com.example.ims.repository.CsvTestProtocolRepository;
import com.example.ims.repository.CsvValidationProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CsvValidationService {

    private final CsvValidationProjectRepository projectRepository;
    private final CsvTestProtocolRepository protocolRepository;
    private final CsvDefectRecordRepository defectRepository;
    private final CsvGoLiveApprovalRepository goLiveRepository;

    // =========================================================================
    // 1. CSV 밸리데이션 마스터 프로젝트 (GAMP 5)
    // =========================================================================

    @Transactional
    public List<CsvProjectResponse> getAllProjects() {
        ensureDefaultsLoaded();
        return projectRepository.findByIsDeletedFalseOrderByPlannedStartDateDesc().stream()
                .map(this::toProjectResponse)
                .collect(Collectors.toList());
    }

    public CsvProjectResponse getProjectById(Long id) {
        CsvValidationProject project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("CSV 프로젝트를 찾을 수 없습니다: " + id));
        return toProjectResponse(project);
    }

    @Transactional
    public CsvProjectResponse createProject(CsvProjectRequest req, String username) {
        CsvValidationProject project = CsvValidationProject.builder()
                .projectCode(req.getProjectCode())
                .projectName(req.getProjectName())
                .systemVersion(req.getSystemVersion())
                .gampCategory(req.getGampCategory())
                .systemDescription(req.getSystemDescription())
                .validationLead(req.getValidationLead() != null ? req.getValidationLead() : username)
                .qaManager(req.getQaManager())
                .executiveSponsor(req.getExecutiveSponsor())
                .plannedStartDate(req.getPlannedStartDate() != null ? req.getPlannedStartDate() : LocalDate.now())
                .plannedEndDate(req.getPlannedEndDate())
                .actualCompletionDate(req.getActualCompletionDate())
                .projectStatus(req.getProjectStatus() != null ? req.getProjectStatus() : CsvProjectStatus.PLANNING)
                .overallConclusion(req.getOverallConclusion())
                .build();

        CsvValidationProject saved = projectRepository.save(project);
        log.info("[CSV] Created project: {} ({}) by {}", saved.getProjectCode(), saved.getProjectName(), username);
        return toProjectResponse(saved);
    }

    @Transactional
    public CsvProjectResponse updateProject(Long id, CsvProjectRequest req, String username) {
        CsvValidationProject project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("CSV 프로젝트를 찾을 수 없습니다: " + id));

        project.setProjectCode(req.getProjectCode());
        project.setProjectName(req.getProjectName());
        project.setSystemVersion(req.getSystemVersion());
        project.setGampCategory(req.getGampCategory());
        project.setSystemDescription(req.getSystemDescription());
        project.setValidationLead(req.getValidationLead());
        project.setQaManager(req.getQaManager());
        project.setExecutiveSponsor(req.getExecutiveSponsor());
        project.setPlannedStartDate(req.getPlannedStartDate());
        project.setPlannedEndDate(req.getPlannedEndDate());
        project.setActualCompletionDate(req.getActualCompletionDate());
        if (req.getProjectStatus() != null) {
            project.setProjectStatus(req.getProjectStatus());
        }
        project.setOverallConclusion(req.getOverallConclusion());

        log.info("[CSV] Updated project: {} by {}", project.getProjectCode(), username);
        return toProjectResponse(project);
    }

    @Transactional
    public void deleteProject(Long id) {
        CsvValidationProject project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("CSV 프로젝트를 찾을 수 없습니다: " + id));
        project.setIsDeleted(true);
        log.info("[CSV] Soft-deleted project: {}", project.getProjectCode());
    }

    // =========================================================================
    // 2. IQ / OQ / PQ 테스트 프로토콜 실행 원장
    // =========================================================================

    public List<CsvProtocolResponse> getProtocolsByProjectId(Long projectId) {
        return protocolRepository.findByProjectIdAndIsDeletedFalseOrderByDisplayOrderAsc(projectId).stream()
                .map(this::toProtocolResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CsvProtocolResponse createProtocol(CsvProtocolRequest req, String username) {
        CsvValidationProject project = projectRepository.findById(req.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("소속 CSV 프로젝트를 찾을 수 없습니다: " + req.getProjectId()));

        CsvTestProtocol protocol = CsvTestProtocol.builder()
                .project(project)
                .protocolNumber(req.getProtocolNumber())
                .testPhase(req.getTestPhase())
                .testTitle(req.getTestTitle())
                .requirementMapping(req.getRequirementMapping())
                .preconditions(req.getPreconditions())
                .executionSteps(req.getExecutionSteps())
                .expectedResult(req.getExpectedResult())
                .actualResult(req.getActualResult())
                .resultStatus(req.getResultStatus() != null ? req.getResultStatus() : TestResultStatus.PENDING)
                .executedBy(req.getExecutedBy() != null ? req.getExecutedBy() : (req.getResultStatus() != null && req.getResultStatus() != TestResultStatus.PENDING ? username : null))
                .executedAt(req.getExecutedAt() != null ? req.getExecutedAt() : (req.getResultStatus() != null && req.getResultStatus() != TestResultStatus.PENDING ? LocalDateTime.now() : null))
                .verifiedBy(req.getVerifiedBy())
                .verifiedAt(req.getVerifiedAt())
                .deviationNotes(req.getDeviationNotes())
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 99)
                .build();

        CsvTestProtocol saved = protocolRepository.save(protocol);
        log.info("[CSV-PROTOCOL] Created protocol: {} [{}] for project={}", saved.getProtocolNumber(), saved.getTestPhase(), project.getProjectCode());
        return toProtocolResponse(saved);
    }

    @Transactional
    public CsvProtocolResponse updateProtocol(Long id, CsvProtocolRequest req, String username) {
        CsvTestProtocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("프로토콜을 찾을 수 없습니다: " + id));

        protocol.setProtocolNumber(req.getProtocolNumber());
        protocol.setTestPhase(req.getTestPhase());
        protocol.setTestTitle(req.getTestTitle());
        protocol.setRequirementMapping(req.getRequirementMapping());
        protocol.setPreconditions(req.getPreconditions());
        protocol.setExecutionSteps(req.getExecutionSteps());
        protocol.setExpectedResult(req.getExpectedResult());
        protocol.setActualResult(req.getActualResult());
        if (req.getResultStatus() != null) {
            protocol.setResultStatus(req.getResultStatus());
            if (protocol.getExecutedBy() == null && req.getResultStatus() != TestResultStatus.PENDING) {
                protocol.setExecutedBy(username);
                protocol.setExecutedAt(LocalDateTime.now());
            }
        }
        if (req.getExecutedBy() != null) protocol.setExecutedBy(req.getExecutedBy());
        if (req.getExecutedAt() != null) protocol.setExecutedAt(req.getExecutedAt());
        if (req.getVerifiedBy() != null) protocol.setVerifiedBy(req.getVerifiedBy());
        if (req.getVerifiedAt() != null) protocol.setVerifiedAt(req.getVerifiedAt());
        protocol.setDeviationNotes(req.getDeviationNotes());
        if (req.getDisplayOrder() != null) protocol.setDisplayOrder(req.getDisplayOrder());

        log.info("[CSV-PROTOCOL] Updated protocol: {} (Result: {})", protocol.getProtocolNumber(), protocol.getResultStatus());
        return toProtocolResponse(protocol);
    }

    @Transactional
    public void deleteProtocol(Long id) {
        CsvTestProtocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("프로토콜을 찾을 수 없습니다: " + id));
        protocol.setIsDeleted(true);
        log.info("[CSV-PROTOCOL] Soft-deleted protocol: {}", protocol.getProtocolNumber());
    }

    // =========================================================================
    // 3. 결함 및 잔여 리스크 관리 (Defects & Risk Acceptance)
    // =========================================================================

    public List<CsvDefectResponse> getDefectsByProjectId(Long projectId) {
        return defectRepository.findByProjectIdAndIsDeletedFalseOrderByReportedAtDesc(projectId).stream()
                .map(this::toDefectResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CsvDefectResponse createDefect(CsvDefectRequest req, String username) {
        CsvValidationProject project = projectRepository.findById(req.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("소속 CSV 프로젝트를 찾을 수 없습니다: " + req.getProjectId()));

        CsvDefectRecord defect = CsvDefectRecord.builder()
                .project(project)
                .defectNumber(req.getDefectNumber())
                .defectTitle(req.getDefectTitle())
                .severity(req.getSeverity())
                .testProtocolNumber(req.getTestProtocolNumber())
                .description(req.getDescription())
                .rootCause(req.getRootCause())
                .correctiveAction(req.getCorrectiveAction())
                .status(req.getStatus() != null ? req.getStatus() : DefectStatus.OPEN)
                .reportedBy(req.getReportedBy() != null ? req.getReportedBy() : username)
                .reportedAt(req.getReportedAt() != null ? req.getReportedAt() : LocalDateTime.now())
                .resolvedBy(req.getResolvedBy())
                .resolvedAt(req.getResolvedAt())
                .riskAcceptanceJustification(req.getRiskAcceptanceJustification())
                .build();

        CsvDefectRecord saved = defectRepository.save(defect);
        log.info("[CSV-DEFECT] Logged defect: {} [{}] for project={}", saved.getDefectNumber(), saved.getSeverity(), project.getProjectCode());
        return toDefectResponse(saved);
    }

    @Transactional
    public CsvDefectResponse updateDefect(Long id, CsvDefectRequest req, String username) {
        CsvDefectRecord defect = defectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("결함 기록을 찾을 수 없습니다: " + id));

        defect.setDefectNumber(req.getDefectNumber());
        defect.setDefectTitle(req.getDefectTitle());
        defect.setSeverity(req.getSeverity());
        defect.setTestProtocolNumber(req.getTestProtocolNumber());
        defect.setDescription(req.getDescription());
        defect.setRootCause(req.getRootCause());
        defect.setCorrectiveAction(req.getCorrectiveAction());
        if (req.getStatus() != null) {
            defect.setStatus(req.getStatus());
            if (req.getStatus() == DefectStatus.RESOLVED && defect.getResolvedBy() == null) {
                defect.setResolvedBy(username);
                defect.setResolvedAt(LocalDateTime.now());
            }
        }
        if (req.getResolvedBy() != null) defect.setResolvedBy(req.getResolvedBy());
        if (req.getResolvedAt() != null) defect.setResolvedAt(req.getResolvedAt());
        defect.setRiskAcceptanceJustification(req.getRiskAcceptanceJustification());

        log.info("[CSV-DEFECT] Updated defect: {} (Status: {})", defect.getDefectNumber(), defect.getStatus());
        return toDefectResponse(defect);
    }

    @Transactional
    public void deleteDefect(Long id) {
        CsvDefectRecord defect = defectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("결함 기록을 찾을 수 없습니다: " + id));
        defect.setIsDeleted(true);
        log.info("[CSV-DEFECT] Soft-deleted defect: {}", defect.getDefectNumber());
    }

    // =========================================================================
    // 4. Go-Live 최종 운영 승인 헌장 및 2대 비즈니스 무결성 가드
    // =========================================================================

    public CsvGoLiveResponse getGoLiveApprovalByProjectId(Long projectId) {
        return goLiveRepository.findByProjectIdAndIsDeletedFalse(projectId)
                .map(this::toGoLiveResponse)
                .orElse(null);
    }

    @Transactional
    public CsvGoLiveResponse createOrUpdateGoLiveApproval(CsvGoLiveRequest req, String username) {
        CsvValidationProject project = projectRepository.findById(req.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("소속 CSV 프로젝트를 찾을 수 없습니다: " + req.getProjectId()));

        // [Guard 1] Go-Live 승인 사전 적격성 검증 (미완료 프로토콜 및 Critical/Major 미해결 결함 차단)
        if ("APPROVED".equalsIgnoreCase(req.getFinalApprovalStatus())) {
            validateGoLiveReadiness(project.getId());
            // [Guard 2] 3자 필수 전자서명 충족 여부 검증
            validateThreePartySignatures(req);
        }

        CsvGoLiveApproval approval = goLiveRepository.findByProjectIdAndIsDeletedFalse(project.getId())
                .orElseGet(() -> CsvGoLiveApproval.builder().project(project).build());

        approval.setReleaseVersion(req.getReleaseVersion());
        approval.setApprovalTitle(req.getApprovalTitle());
        approval.setSystemOwnerName(req.getSystemOwnerName());
        approval.setSystemOwnerSignedAt(req.getSystemOwnerSignedAt());
        approval.setSystemOwnerSignatureNumber(req.getSystemOwnerSignatureNumber());

        approval.setQaLeadName(req.getQaLeadName());
        approval.setQaLeadSignedAt(req.getQaLeadSignedAt());
        approval.setQaLeadSignatureNumber(req.getQaLeadSignatureNumber());

        approval.setExecutiveName(req.getExecutiveName());
        approval.setExecutiveSignedAt(req.getExecutiveSignedAt());
        approval.setExecutiveSignatureNumber(req.getExecutiveSignatureNumber());

        approval.setFinalApprovalStatus(req.getFinalApprovalStatus() != null ? req.getFinalApprovalStatus() : "APPROVED");
        approval.setGoLiveDate(req.getGoLiveDate() != null ? req.getGoLiveDate() : LocalDate.now());
        approval.setContingencyPlan(req.getContingencyPlan());
        approval.setAuthorizedNotes(req.getAuthorizedNotes());

        CsvGoLiveApproval saved = goLiveRepository.save(approval);

        // 프로젝트 상태를 정식 가동(OPERATIONAL)으로 자동 전환
        if ("APPROVED".equalsIgnoreCase(saved.getFinalApprovalStatus())) {
            project.setProjectStatus(CsvProjectStatus.OPERATIONAL);
            project.setActualCompletionDate(LocalDate.now());
            log.info("[CSV GO-LIVE] System successfully authorized for OPERATIONAL use! Project={}", project.getProjectCode());
        }

        return toGoLiveResponse(saved);
    }

    /**
     * [Guard 1] Go-Live 사전 적격성 검증:
     * 1) 등록된 모든 테스트 프로토콜이 PASS 또는 사유가 명시된 WAIVED/DEVIATION_ACCEPTED 이어야 함 (FAIL 또는 PENDING 시 차단)
     * 2) 미해결(OPEN) 상태인 CRITICAL 또는 MAJOR 결함이 없어야 함
     */
    public void validateGoLiveReadiness(Long projectId) {
        List<CsvTestProtocol> protocols = protocolRepository.findByProjectIdAndIsDeletedFalseOrderByDisplayOrderAsc(projectId);
        for (CsvTestProtocol p : protocols) {
            if (p.getResultStatus() == TestResultStatus.FAIL || p.getResultStatus() == TestResultStatus.PENDING) {
                log.warn("[GO-LIVE GUARD] Blocked by unapproved test protocol: {} (Status: {})", p.getProtocolNumber(), p.getResultStatus());
                throw new IllegalStateException("Go-Live 승인 불가: 미완료(PENDING) 또는 불합격(FAIL) 상태의 테스트 프로토콜이 존재합니다. [프로토콜 번호: " + p.getProtocolNumber() + " - " + p.getTestTitle() + "]");
            }
        }

        List<CsvDefectRecord> defects = defectRepository.findByProjectIdAndIsDeletedFalseOrderByReportedAtDesc(projectId);
        for (CsvDefectRecord d : defects) {
            if (d.getStatus() == DefectStatus.OPEN && (d.getSeverity() == DefectSeverity.CRITICAL || d.getSeverity() == DefectSeverity.MAJOR)) {
                log.warn("[GO-LIVE GUARD] Blocked by open critical/major defect: {} [{}]", d.getDefectNumber(), d.getSeverity());
                throw new IllegalStateException("Go-Live 승인 불가: 미해결된 치명적(CRITICAL) 또는 중대(MAJOR) 결함이 존재합니다. 결함 조치 또는 정당화된 리스크 수용(ACCEPTED_RISK) 절차가 선행되어야 합니다. [결함 번호: " + d.getDefectNumber() + "]");
            }
        }
    }

    /**
     * [Guard 2] 3자 필수 권한자 전자서명 검증 (System Owner, QA Lead, Executive)
     */
    public void validateThreePartySignatures(CsvGoLiveRequest req) {
        if (req.getSystemOwnerSignedAt() == null || req.getQaLeadSignedAt() == null || req.getExecutiveSignedAt() == null) {
            log.warn("[GO-LIVE GUARD] Incomplete 3-party signatures: Owner={}, QA={}, Exec={}",
                    req.getSystemOwnerSignedAt() != null, req.getQaLeadSignedAt() != null, req.getExecutiveSignedAt() != null);
            throw new IllegalStateException("Go-Live 최종 운영 승인 불가: 시스템 관리자(System Owner), 품질관리 책임자(QA Lead), 최고경영자(Executive Sponsor) 3인의 필수 전자서명이 모두 완료되어야 정식 가동 인가가 가능합니다.");
        }
    }

    // =========================================================================
    // 5. 6대 반응형 종합 CSV KPI 지표
    // =========================================================================

    @Transactional
    public CsvKpiResponse getKpi() {
        ensureDefaultsLoaded();

        long totalProjects = projectRepository.countByIsDeletedFalse();
        long totalProtocols = protocolRepository.countByIsDeletedFalse();
        long passedProtocols = protocolRepository.countByResultStatusAndIsDeletedFalse(TestResultStatus.PASS);
        double passRate = totalProtocols > 0 ? ((double) passedProtocols / totalProtocols) * 100.0 : 100.0;
        passRate = Math.round(passRate * 10.0) / 10.0;

        long openDefects = defectRepository.countByStatusAndIsDeletedFalse(DefectStatus.OPEN);
        long acceptedRisks = defectRepository.countByStatusAndIsDeletedFalse(DefectStatus.ACCEPTED_RISK);

        // Go-Live 헌장 상태 파악
        List<CsvGoLiveApproval> approvals = goLiveRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        String goLiveStatus = approvals.isEmpty() ? "PLANNING" : approvals.get(0).getFinalApprovalStatus();

        // Go-Live 준비도 지수 (프로토콜 통과율과 결함 해결도 종합 산출)
        double readinessRate = (passRate * 0.7) + (openDefects == 0 ? 30.0 : Math.max(0.0, 30.0 - (openDefects * 10.0)));
        readinessRate = Math.min(100.0, Math.round(readinessRate * 10.0) / 10.0);

        return CsvKpiResponse.builder()
                .totalProjects(totalProjects)
                .totalProtocols(totalProtocols)
                .passedProtocols(passedProtocols)
                .passRate(passRate)
                .openDefects(openDefects)
                .acceptedRisks(acceptedRisks)
                .goLiveStatus(goLiveStatus)
                .goLiveReadinessRate(readinessRate)
                .build();
    }

    // =========================================================================
    // 6. GAMP 5 초기 기준선 시드 데이터 자동 초기화 (DEC-01 / V148)
    // =========================================================================

    @Transactional
    public synchronized void ensureDefaultsLoaded() {
        if (projectRepository.countByIsDeletedFalse() == 0) {
            initDefaultValidationProject();
        }
    }

    @Transactional
    public void initDefaultValidationProject() {
        if (projectRepository.countByIsDeletedFalse() > 0) return;

        log.info("[CSV INIT] Populating default GAMP 5 CSV validation project & IQ/OQ/PQ protocols...");

        // 1. Master Project
        CsvValidationProject project = CsvValidationProject.builder()
                .projectCode("CSV-2026-001")
                .projectName("통합 eQMS 품질관리시스템 v1.0 컴퓨터화 시스템 밸리데이션")
                .systemVersion("v1.0.0-PROD")
                .gampCategory(GampCategory.CATEGORY_5_CUSTOM)
                .systemDescription("FDA 21 CFR Part 11, EU Annex 11, ISO 13485:2016 §4.1.6 및 ISO 22716에 부합하는 전사 통합 전자기록·전자서명 및 의료기기·화장품 QMS 플랫폼")
                .validationLead("시스템운영팀장 이운영")
                .qaManager("품질관리책임자 김품질")
                .executiveSponsor("대표이사 홍길동")
                .plannedStartDate(LocalDate.of(2026, 10, 1))
                .plannedEndDate(LocalDate.of(2026, 10, 25))
                .actualCompletionDate(LocalDate.of(2026, 10, 25))
                .projectStatus(CsvProjectStatus.OPERATIONAL)
                .overallConclusion("GAMP 5 V-모델에 입각한 13개 핵심 프로토콜(IQ 4건, OQ 6건, PQ 3건) 전수 합격 확인 완료. 2건의 경미 결함 조치 및 잔여 리스크 통제 완료로 전사 정식 가동(Go-Live) 승인 인가함.")
                .build();

        CsvValidationProject savedProject = projectRepository.save(project);

        // 2. Protocols (IQ 4건, OQ 6건, PQ 3건 = 13건)
        List<CsvTestProtocol> protocols = List.of(
                // IQ Protocols
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-IQ-001")
                        .testPhase(ValidationTestPhase.IQ)
                        .testTitle("서버 인프라 및 JVM 17 런타임 환경 적격성 검증")
                        .requirementMapping("URS-INF-01, GAMP 5 §4")
                        .preconditions("Ubuntu/Windows Server, OpenJDK 17 설치 완료")
                        .executionSteps("1. java -version 확인\n2. 힙 메모리(-Xms1g -Xmx2g) 할당 검증\n3. 시스템 포트(8080/5173) 바인딩 확인")
                        .expectedResult("OpenJDK 17 정상 구동 및 메모리 옵션 정상 적용")
                        .actualResult("Java 17.0.6 정상 기동, GC 로그 정상 기록 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 20, 10, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 20, 11, 0))
                        .displayOrder(1)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-IQ-002")
                        .testPhase(ValidationTestPhase.IQ)
                        .testTitle("데이터베이스 스키마 및 Flyway 마이그레이션(V131~V148) 무결성 검증")
                        .requirementMapping("URS-DB-01, 21 CFR §11.10(e)")
                        .preconditions("PostgreSQL / H2 데이터베이스 기동")
                        .executionSteps("1. Flyway clean-migrate 체크섬 검증\n2. V131~V148 18개 핵심 테이블 생성 여부 확인\n3. DDL 감사 인덱스 생성 확인")
                        .expectedResult("체크섬 불일치 0건, 마이그레이션 100% 정상 적용")
                        .actualResult("V131~V148 마이그레이션 100% 성공, 테이블 18종 정상 생성")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 20, 11, 30))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 20, 12, 0))
                        .displayOrder(2)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-IQ-003")
                        .testPhase(ValidationTestPhase.IQ)
                        .testTitle("보안 네트워크 환경 및 Origin/Referer 검증 필터(DEC-08) 설치 적격성")
                        .requirementMapping("DEC-08, URS-SEC-01")
                        .preconditions("Spring Security 필터 체인 구성")
                        .executionSteps("1. Origin/Referer 헤더 위조 요청 발송\n2. Custom Header(X-Requested-With) 부재 시 차단 여부 검증")
                        .expectedResult("비인가 Origin 및 외부 직접 접근 요청 403 Forbidden 정상 차단")
                        .actualResult("OriginRefererGuardFilter 정상 작동, 비인가 접근 차단 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 20, 14, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 20, 15, 0))
                        .displayOrder(3)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-IQ-004")
                        .testPhase(ValidationTestPhase.IQ)
                        .testTitle("파일 스토리지 입출력 및 품질증빙 영구보존 디렉터리 검증")
                        .requirementMapping("URS-FILE-01, ISO 13485 §4.2.5")
                        .preconditions("uploads 디렉터리 권한 및 DB 백업 스토리지 연결")
                        .executionSteps("1. COA, 도면, 시험성적서 첨부파일 업로드\n2. 파일시스템 및 DB Base64 백업 동기화 확인")
                        .expectedResult("파일 IO 정상, 디렉터리 권한 755 정상 적용")
                        .actualResult("파일 업로드/다운로드 및 DB 이중화 보존 정상 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 20, 16, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 20, 17, 0))
                        .displayOrder(4)
                        .build(),

                // OQ Protocols
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-OQ-001")
                        .testPhase(ValidationTestPhase.OQ)
                        .testTitle("21 CFR Part 11 §11.200 전자서명 2차 비밀번호 재인증 가드 검증")
                        .requirementMapping("21 CFR §11.200, SOP-DEC-01")
                        .preconditions("admin 사용자 로그인 세션 활성화")
                        .executionSteps("1. 서명 모달에서 틀린 비밀번호 입력 후 서명 시도\n2. 올바른 비밀번호 입력 후 서명 시도")
                        .expectedResult("틀린 비밀번호 시 400 Bad Request 차단, 올바른 비밀번호 시 SIG- 서명 정상 발행")
                        .actualResult("대리서명 시도 원천 차단 확인, 올바른 비밀번호 입력 시 201 Created 정상 발행")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("박테스터")
                        .executedAt(LocalDateTime.of(2026, 10, 21, 10, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 21, 11, 0))
                        .displayOrder(5)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-OQ-002")
                        .testPhase(ValidationTestPhase.OQ)
                        .testTitle("21 CFR Part 11 §11.70 전자서명 SHA-256 무결성 해시 및 매니페스트 결합 검증")
                        .requirementMapping("21 CFR §11.50, §11.70")
                        .preconditions("완제품 출하승인서 서명 요청")
                        .executionSteps("1. 서명 생성 시 64자리 SHA-256 해시 생성 검증\n2. JSON 매니페스트에 서명자, 일시, 의미 강제 결합 확인")
                        .expectedResult("SHA-256 해시 64자리 일치, 서명 매니페스트 블록 정상 생성")
                        .actualResult("해시 무결성 유효율 100%, Manifest JSON 정상 결합 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("박테스터")
                        .executedAt(LocalDateTime.of(2026, 10, 21, 11, 30))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 21, 12, 0))
                        .displayOrder(6)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-OQ-003")
                        .testPhase(ValidationTestPhase.OQ)
                        .testTitle("출하승인(MARKET_RELEASE) 시험성적서 부적합 시 결재 상신 원천 차단 가드")
                        .requirementMapping("DEC-05, ISO 13485 §8.2.6")
                        .preconditions("시험성적서 FAIL 상태인 제조 로트")
                        .executionSteps("1. 시험 부적합 로트에 대해 출하승인 결재 요청 시도\n2. 결재 상신 차단 예외 발생 확인")
                        .expectedResult("적합(CONFORMING) 증빙 없는 출하 결재 원천 차단 (400 Bad Request)")
                        .actualResult("품질검사 미적합 시 출하 결재 차단 가드 정상 작동 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("박테스터")
                        .executedAt(LocalDateTime.of(2026, 10, 21, 14, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 21, 15, 0))
                        .displayOrder(7)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-OQ-004")
                        .testPhase(ValidationTestPhase.OQ)
                        .testTitle("CAPA 21 CFR 820.100 미완료 조치과제 및 유효성 미검증 종결 차단 가드")
                        .requirementMapping("21 CFR 820.100, ISO 13485 §8.5.2")
                        .preconditions("CAPA 조치과제가 PENDING 상태인 건")
                        .executionSteps("1. 조치과제 미완료 상태에서 CAPA 종결(CLOSED) 시도\n2. 예외 발생 확인\n3. 조치과제 완료 및 유효성 검증 후 종결 시도")
                        .expectedResult("조치 미완료 시 409 Conflict 차단, 모든 요건 충족 시에만 종결 승인")
                        .actualResult("2대 종결 차단 가드 100% 정상 작동 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("박테스터")
                        .executedAt(LocalDateTime.of(2026, 10, 21, 15, 30))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 21, 16, 30))
                        .displayOrder(8)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-OQ-005")
                        .testPhase(ValidationTestPhase.OQ)
                        .testTitle("규제보고(Vigilance) 국가별(MFDS/FDA/EU) 법정 보고 기한 자동산출 및 회수 수량 대사 가드")
                        .requirementMapping("MFDS 의료기기법 제31조, 21 CFR 803, EU MDR Art.87")
                        .preconditions("이상사례 중대사고 등록 및 회수 건 등록")
                        .executionSteps("1. 중대사고 등록 시 15일/30일 법정기한 자동 계산 확인\n2. 회수 수량 대사 불일치 시 회수 종결 차단 확인")
                        .expectedResult("법정기한 정확 산출, 회수 수량(출고!=회수+격리+폐기+미회수) 불일치 시 종결 차단")
                        .actualResult("법정기한 엔진 및 수량 100% 대사 가드 정상 통과")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("박테스터")
                        .executedAt(LocalDateTime.of(2026, 10, 22, 10, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 22, 11, 0))
                        .displayOrder(9)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-OQ-006")
                        .testPhase(ValidationTestPhase.OQ)
                        .testTitle("내부심사 심사원 독립성 가드 및 Finding-CAPA 의무 연계 통제")
                        .requirementMapping("ISO 13485 §8.2.4, ISO 19011 §5.4")
                        .preconditions("내부심사 계획 및 지적사항 등록")
                        .executionSteps("1. 피심사부서와 심사원 소속부서 동일 시 등록 시도\n2. Critical 부적합의 CAPA 번호 없이 종결 시도")
                        .expectedResult("자기부서 심사 배정 차단(400), Critical 지적사항 CAPA 누락 시 종결 차단(409)")
                        .actualResult("독립성 가드 및 CAPA 연계 가드 100% 정상 작동")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("박테스터")
                        .executedAt(LocalDateTime.of(2026, 10, 22, 14, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 22, 15, 0))
                        .displayOrder(10)
                        .build(),

                // PQ Protocols
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-PQ-001")
                        .testPhase(ValidationTestPhase.PQ)
                        .testTitle("동시 100사용자 접속 및 트랜잭션 동기 커밋 성능·무결성 검증")
                        .requirementMapping("URS-PERF-01, 21 CFR §11.10(a)")
                        .preconditions("JMeter / Apache Bench 부하 테스트 환경")
                        .executionSteps("1. 100 동시 스레드로 결재/서명/조회 API 1,000건 연속 호출\n2. 감사로그 유실률 및 평균 응답시간 측정")
                        .expectedResult("감사추적 유실률 0%, 평균 응답시간 500ms 이내")
                        .actualResult("유실률 0%, 평균 응답 180ms, DB Hikari 커넥션 풀 경합 없음 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 23, 10, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 23, 11, 30))
                        .displayOrder(11)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-PQ-002")
                        .testPhase(ValidationTestPhase.PQ)
                        .testTitle("대용량(10,000건) 품질 이력 그리드 렌더링 및 CSV 데이터 내보내기 성능")
                        .requirementMapping("URS-PERF-02, AG Grid Standards")
                        .preconditions("10,000건 감사로그 / LOT 추적성 데이터 적재")
                        .executionSteps("1. AG Grid legacy 테마 렌더링 시간 측정\n2. 10,000건 CSV 다운로드 완료 시간 측정")
                        .expectedResult("그리드 렌더링 1.5초 이내, CSV 내보내기 3초 이내")
                        .actualResult("그리드 최초 렌더링 0.8초, CSV 내보내기 1.2초 완료 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 23, 14, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 23, 15, 0))
                        .displayOrder(12)
                        .build(),
                CsvTestProtocol.builder()
                        .project(savedProject)
                        .protocolNumber("VAL-PQ-003")
                        .testPhase(ValidationTestPhase.PQ)
                        .testTitle("비정상 서버 재기동 시 세션 복원성 및 DB 락 경합 해소 검증")
                        .requirementMapping("URS-REL-01, GAMP 5 §8")
                        .preconditions("트랜잭션 실행 중 프로세스 강제 종료(kill)")
                        .executionSteps("1. 결재 처리 중 서버 재기동\n2. 트랜잭션 롤백 및 H2/PostgreSQL DB 락 해제 상태 확인")
                        .expectedResult("데이터 불일치 없는 원자적 롤백 및 30초 내 정상 서비스 재개")
                        .actualResult("트랜잭션 무결성 보존 및 자동 락 해제 재기동 확인")
                        .resultStatus(TestResultStatus.PASS)
                        .executedBy("이운영")
                        .executedAt(LocalDateTime.of(2026, 10, 23, 16, 0))
                        .verifiedBy("김품질")
                        .verifiedAt(LocalDateTime.of(2026, 10, 23, 17, 0))
                        .displayOrder(13)
                        .build()
        );

        protocolRepository.saveAll(protocols);
        log.info("[CSV INIT] Seeded {} IQ/OQ/PQ test protocols", protocols.size());

        // 3. Defects (2건 시딩 - 조치 완료 / 리스크 수용)
        List<CsvDefectRecord> defects = List.of(
                CsvDefectRecord.builder()
                        .project(savedProject)
                        .defectNumber("DEF-2026-001")
                        .defectTitle("일부 모바일 해상도에서 AG Grid 우측 고정 액션 버튼 줄바꿈 현상")
                        .severity(DefectSeverity.MINOR)
                        .testProtocolNumber("VAL-PQ-002")
                        .description("모바일 뷰포트(width < 768px)에서 그리드 액션 컬럼의 패딩 초과로 버튼이 다음 줄로 밀리는 현상 발생")
                        .rootCause("AG Grid pinned right 컬럼 최소 너비(minWidth: 120px) 미지정")
                        .correctiveAction("컬럼 정의에 minWidth: 140px 및 flex: 1 반응형 속성 추가 적용하여 정상 표출 조치")
                        .status(DefectStatus.RESOLVED)
                        .reportedBy("박테스터")
                        .reportedAt(LocalDateTime.of(2026, 10, 22, 16, 0))
                        .resolvedBy("이개발")
                        .resolvedAt(LocalDateTime.of(2026, 10, 23, 9, 0))
                        .build(),
                CsvDefectRecord.builder()
                        .project(savedProject)
                        .defectNumber("DEF-2026-002")
                        .defectTitle("로컬 H2 환경에서 다량의 파일 바이너리 저장 시 경고 로그 발생")
                        .severity(DefectSeverity.MINOR)
                        .testProtocolNumber("VAL-IQ-004")
                        .description("H2 인메모리 테스트 시 1MB 초과 이미지 업로드에 따른 Binary column 경고 출력")
                        .rootCause("로컬 H2 방언(H2Dialect)과 운영 Supabase PostgreSQL BYTEA 타입 간의 스토리지 매핑 차이")
                        .correctiveAction("운영 환경(Supabase)은 대용량 파일 바이너리가 전용 스토리지에 격리 분리되므로 품질 영향 없음 확인")
                        .status(DefectStatus.ACCEPTED_RISK)
                        .reportedBy("박테스터")
                        .reportedAt(LocalDateTime.of(2026, 10, 23, 11, 0))
                        .resolvedBy("김품질")
                        .resolvedAt(LocalDateTime.of(2026, 10, 23, 15, 0))
                        .riskAcceptanceJustification("로컬 H2는 개발 전용이며 운영 환경은 독립 Supabase Storage를 사용하므로 실제 제품 품질 및 규제 적합성에 영향 없음 (QA 승인 완료)")
                        .build()
        );
        defectRepository.saveAll(defects);
        log.info("[CSV INIT] Seeded {} CSV validation defects", defects.size());

        // 4. Go-Live Release Authorization Charter (3자 서명 완료)
        CsvGoLiveApproval approval = CsvGoLiveApproval.builder()
                .project(savedProject)
                .releaseVersion("v1.0.0-PROD")
                .approvalTitle("통합 eQMS 시스템 v1.0 정식 가동 승인 헌장 (Go-Live Release Charter)")
                .systemOwnerName("시스템운영팀장 이운영")
                .systemOwnerSignedAt(LocalDateTime.of(2026, 10, 25, 14, 0))
                .systemOwnerSignatureNumber("SIG-20261025-SYS01")
                .qaLeadName("품질관리책임자 김품질")
                .qaLeadSignedAt(LocalDateTime.of(2026, 10, 25, 15, 30))
                .qaLeadSignatureNumber("SIG-20261025-QA001")
                .executiveName("대표이사 홍길동")
                .executiveSignedAt(LocalDateTime.of(2026, 10, 25, 17, 0))
                .executiveSignatureNumber("SIG-20261025-CEO01")
                .finalApprovalStatus("APPROVED")
                .goLiveDate(LocalDate.of(2026, 10, 26))
                .contingencyPlan("장애 발생 시 1시간 이내 이전 핫픽스 버전 롤백 및 Supabase 6시간 단위 PITR 백업 복구 절차 수립 완료")
                .authorizedNotes("본 시스템은 GAMP 5, FDA 21 CFR Part 11, ISO 13485:2016 §4.1.6 규정에 따라 소프트웨어 수명주기 전반의 적격성평가(IQ/OQ/PQ)를 100% 완수하였으며, 잔여 위험에 대한 수용 심의를 거쳐 2026년 10월 26일부로 전사 정식 운영(Go-Live)을 최종 인가함.")
                .build();

        goLiveRepository.save(approval);
        log.info("[CSV INIT] Seeded Go-Live Approval Charter for {}", savedProject.getProjectCode());
    }

    // =========================================================================
    // DTO Mappers
    // =========================================================================

    private CsvProjectResponse toProjectResponse(CsvValidationProject p) {
        long totalProtocols = protocolRepository.countByProjectIdAndIsDeletedFalse(p.getId());
        long passedProtocols = protocolRepository.countByProjectIdAndResultStatusAndIsDeletedFalse(p.getId(), TestResultStatus.PASS);
        long openDefects = defectRepository.countByProjectIdAndStatusAndIsDeletedFalse(p.getId(), DefectStatus.OPEN);

        return CsvProjectResponse.builder()
                .id(p.getId())
                .projectCode(p.getProjectCode())
                .projectName(p.getProjectName())
                .systemVersion(p.getSystemVersion())
                .gampCategory(p.getGampCategory())
                .gampCategoryDescription(p.getGampCategory() != null ? p.getGampCategory().getDescription() : "")
                .systemDescription(p.getSystemDescription())
                .validationLead(p.getValidationLead())
                .qaManager(p.getQaManager())
                .executiveSponsor(p.getExecutiveSponsor())
                .plannedStartDate(p.getPlannedStartDate())
                .plannedEndDate(p.getPlannedEndDate())
                .actualCompletionDate(p.getActualCompletionDate())
                .projectStatus(p.getProjectStatus())
                .projectStatusDescription(p.getProjectStatus() != null ? p.getProjectStatus().getDescription() : "")
                .overallConclusion(p.getOverallConclusion())
                .totalProtocols(totalProtocols)
                .passedProtocols(passedProtocols)
                .openDefects(openDefects)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private CsvProtocolResponse toProtocolResponse(CsvTestProtocol p) {
        return CsvProtocolResponse.builder()
                .id(p.getId())
                .projectId(p.getProject().getId())
                .projectCode(p.getProject().getProjectCode())
                .protocolNumber(p.getProtocolNumber())
                .testPhase(p.getTestPhase())
                .testPhaseDescription(p.getTestPhase() != null ? p.getTestPhase().getDescription() : "")
                .testTitle(p.getTestTitle())
                .requirementMapping(p.getRequirementMapping())
                .preconditions(p.getPreconditions())
                .executionSteps(p.getExecutionSteps())
                .expectedResult(p.getExpectedResult())
                .actualResult(p.getActualResult())
                .resultStatus(p.getResultStatus())
                .resultStatusDescription(p.getResultStatus() != null ? p.getResultStatus().getDescription() : "")
                .executedBy(p.getExecutedBy())
                .executedAt(p.getExecutedAt())
                .verifiedBy(p.getVerifiedBy())
                .verifiedAt(p.getVerifiedAt())
                .deviationNotes(p.getDeviationNotes())
                .displayOrder(p.getDisplayOrder())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private CsvDefectResponse toDefectResponse(CsvDefectRecord d) {
        return CsvDefectResponse.builder()
                .id(d.getId())
                .projectId(d.getProject().getId())
                .projectCode(d.getProject().getProjectCode())
                .defectNumber(d.getDefectNumber())
                .defectTitle(d.getDefectTitle())
                .severity(d.getSeverity())
                .severityDescription(d.getSeverity() != null ? d.getSeverity().getDescription() : "")
                .testProtocolNumber(d.getTestProtocolNumber())
                .description(d.getDescription())
                .rootCause(d.getRootCause())
                .correctiveAction(d.getCorrectiveAction())
                .status(d.getStatus())
                .statusDescription(d.getStatus() != null ? d.getStatus().getDescription() : "")
                .reportedBy(d.getReportedBy())
                .reportedAt(d.getReportedAt())
                .resolvedBy(d.getResolvedBy())
                .resolvedAt(d.getResolvedAt())
                .riskAcceptanceJustification(d.getRiskAcceptanceJustification())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }

    private CsvGoLiveResponse toGoLiveResponse(CsvGoLiveApproval a) {
        boolean isFullySigned = a.getSystemOwnerSignedAt() != null
                && a.getQaLeadSignedAt() != null
                && a.getExecutiveSignedAt() != null;

        return CsvGoLiveResponse.builder()
                .id(a.getId())
                .projectId(a.getProject().getId())
                .projectCode(a.getProject().getProjectCode())
                .projectName(a.getProject().getProjectName())
                .releaseVersion(a.getReleaseVersion())
                .approvalTitle(a.getApprovalTitle())
                .systemOwnerName(a.getSystemOwnerName())
                .systemOwnerSignedAt(a.getSystemOwnerSignedAt())
                .systemOwnerSignatureNumber(a.getSystemOwnerSignatureNumber())
                .qaLeadName(a.getQaLeadName())
                .qaLeadSignedAt(a.getQaLeadSignedAt())
                .qaLeadSignatureNumber(a.getQaLeadSignatureNumber())
                .executiveName(a.getExecutiveName())
                .executiveSignedAt(a.getExecutiveSignedAt())
                .executiveSignatureNumber(a.getExecutiveSignatureNumber())
                .finalApprovalStatus(a.getFinalApprovalStatus())
                .goLiveDate(a.getGoLiveDate())
                .contingencyPlan(a.getContingencyPlan())
                .authorizedNotes(a.getAuthorizedNotes())
                .isFullySigned(isFullySigned)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
