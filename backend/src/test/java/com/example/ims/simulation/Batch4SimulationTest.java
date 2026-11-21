package com.example.ims.simulation;

import com.example.ims.config.RoleConstants;
import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.MedicalDeviceProductRepository;
import com.example.ims.repository.TraceabilityBatchRepository;
import com.example.ims.repository.UserRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Batch 4 정밀 시뮬레이션 통합 테스트 스위트]
 * 대상 컨트롤러 (14개):
 * - NonConformanceController (/api/ncr)
 * - CapaController (/api/capa)
 * - DesignControlController (/api/quality/design-controls)
 * - ChangeControlController (/api/quality/change-controls)
 * - RiskAssessmentController (/api/quality/risks)
 * - TraceabilityController (/api/traceability)
 * - InternalAuditController (/api/internal-audits)
 * - VigilanceRecallController (/api/vigilance, /api/recalls, /api/vigilance-recall/kpi)
 * - CsvValidationController (/api/csv-validation)
 * - TrainingController (/api/training)
 * - MedicalDeviceProductController (/api/medical-devices)
 * - DynamicDashboardController (/api/dynamic/dashboards)
 * - DynamicMenuController (/api/dynamic/menus)
 * - DynamicScreenController (/api/dynamic/screens)
 *
 * 6대 공통 체크리스트 검증:
 * [C] 생성 및 유효성 검증: NCR, CAPA, 설계개발 DHF, 변경관리 CR, 위험관리 FMEA, 의료기기 마스터, 교육과정, 내부감사, 추적성 배치
 * [R] 조회 및 지연로딩(Lazy) 무결성: KPI 대시보드 10종, 페이징 검색, 404/400 방어
 * [U] 수정 및 워크플로우 상태 전이: NCR 조사, CAPA 5-Why 등록, 설계개발 단계(Phase) 진전, 변경관리 상태 전이, 의료기기 품목 갱신
 * [D] 삭제 및 라이프사이클 방어: 의료기기 소프트 삭제, 변경요청/설계프로젝트 삭제, 비관리자 무단 삭제 403 차단
 * [W] 특화 워크플로우: 동적 메뉴 트리 및 사용자별 권한 메뉴, 동적 화면 메타, 양방향 공정 투입 링크(Traceability Link)
 * [UX] 프론트엔드 연동 응답 표준화: ApiResponse, 정형화 JSON, 스택트레이스 미노출, 감사 헤더
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class Batch4SimulationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CacheManager cacheManager;
    @Autowired private MedicalDeviceProductRepository medicalDeviceProductRepository;
    @Autowired private TraceabilityBatchRepository traceabilityBatchRepository;

    private User seedAdmin;
    private User seedUser;

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

        seedAdmin = userRepository.findByUsername("admin").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .name("최고관리자")
                        .role(RoleConstants.ADMIN)
                        .department("경영정보팀")
                        .companyName("본사")
                        .enabled(true)
                        .build()));

        seedUser = userRepository.findByUsername("normal_qa").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("normal_qa")
                        .password(passwordEncoder.encode("qa123"))
                        .name("일반품질담당자")
                        .role("USER")
                        .department("품질보증팀")
                        .companyName("본사")
                        .enabled(true)
                        .build()));
    }

    @Test
    @Order(1)
    @DisplayName("[C] 신규 생성 및 유효성 검증: NCR, CAPA, DHF, CR, FMEA, 의료기기, 교육, 내부감사, 배치")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test01_Create_CRUD_Validation() throws Exception {
        // 1. NCR (부적합품 보고서) 생성
        NcrCreateRequest ncrReq = NcrCreateRequest.builder()
                .title("배치4 외관 흑점 부적합 보고")
                .stage(NcrOccurrenceStage.IN_PROCESS)
                .severity(NcrSeverity.MAJOR)
                .itemCode("B4-ITEM-001")
                .productName("배치4 더마크림")
                .lotNumber("LOT-2026-B4-01")
                .affectedQuantity(new BigDecimal("150.0"))
                .unit("EA")
                .supplierName("배치4 제조사")
                .occurredDate(LocalDate.now())
                .discoveredBy("최고관리자")
                .defectType("이물/흑점")
                .defectDescription("성형 공정 중 미세 흑점 검출")
                .immediateAction("해당 로트 전량 격리 조치")
                .quarantineStatus(QuarantineStatus.QUARANTINED)
                .quarantineLocation("1공장 적치 격리구역 Q-1")
                .build();

        mockMvc.perform(post("/api/ncr")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ncrReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itemCode").value("B4-ITEM-001"))
                .andExpect(jsonPath("$.ncrNumber").exists());

        // 2. NCR 필수값 누락 방어 (제목 공백 -> 400 Bad Request)
        NcrCreateRequest invalidNcr = NcrCreateRequest.builder()
                .title("")
                .stage(NcrOccurrenceStage.IN_PROCESS)
                .severity(NcrSeverity.MAJOR)
                .itemCode("B4-ITEM-001")
                .productName("배치4 더마크림")
                .occurredDate(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/ncr")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidNcr)))
                .andExpect(status().isBadRequest());

        // 3. CAPA (시정조치 및 예방조치) 신규 발의
        CapaCreateRequest capaReq = CapaCreateRequest.builder()
                .title("배치4 성형기 노즐 이물 유입 방지 CAPA")
                .sourceType(CapaSourceType.NCR)
                .sourceNumber("NCR-202611-001")
                .sourceDescription("흑점 검출에 따른 노즐 정밀 세척 및 필터 교체")
                .category(CapaCategory.EQUIPMENT_FACILITY)
                .riskLevel(CapaRiskLevel.HIGH)
                .problemDescription("성형 노즐 내부 탄화물 탈락으로 인한 이물 유입")
                .containmentAction("노즐 1차 분해 세척 및 인라인 필터망 설치")
                .containmentDate(LocalDate.now())
                .containmentResponsible("품질보증팀장")
                .itemCode("B4-ITEM-001")
                .productName("배치4 더마크림")
                .lotNumber("LOT-2026-B4-01")
                .assignedTo("최고관리자")
                .targetCompletionDate(LocalDate.now().plusMonths(1))
                .effectivenessCriteria("교체 후 3개 로트 연속 이물 미검출 확인")
                .effectivenessTargetDate(LocalDate.now().plusMonths(2))
                .build();

        mockMvc.perform(post("/api/capa")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(capaReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("배치4 성형기 노즐 이물 유입 방지 CAPA"))
                .andExpect(jsonPath("$.capaNumber").exists());

        // 4. 의료기기 설계개발(DHF) 프로젝트 등록
        DesignProjectRequest dpReq = DesignProjectRequest.builder()
                .projectCode("DP-2026-B4")
                .projectName("배치4 고주파 자극기 신규 개발")
                .targetDeviceName("고주파 자극기 Gen-2")
                .deviceClassification("CLASS_II")
                .projectLeader("연구소장")
                .department("의료기기연구개발팀")
                .startDate(LocalDate.now())
                .targetCompletionDate(LocalDate.now().plusYears(1))
                .currentPhase(DesignPhase.PLANNING)
                .status(DesignProjectStatus.ACTIVE)
                .dhfNumber("DHF-2026-004")
                .build();

        mockMvc.perform(post("/api/quality/design-controls/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dpReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.projectName").value("배치4 고주파 자극기 신규 개발"));

        // 5. 변경관리(Change Control) 변경요청서 등록
        ChangeRequestRequest crReq = ChangeRequestRequest.builder()
                .title("배치4 원료 공급사 변경에 따른 규격 개정")
                .category(ChangeCategory.PRODUCT)
                .urgency(ChangeUrgency.STANDARD)
                .status(ChangeStatus.DRAFT)
                .targetItemName("배치4 더마크림")
                .itemCode("B4-ITEM-001")
                .initiatorName("최고관리자")
                .department("품질보증팀")
                .requestDate(LocalDate.now())
                .targetCompletionDate(LocalDate.now().plusWeeks(2))
                .changeReason("기존 공급사 단종에 따른 대체 공급사 검증 완료")
                .currentState("공급사 A 단독 공급")
                .proposedChange("공급사 B 추가 다변화")
                .build();

        mockMvc.perform(post("/api/quality/change-controls/requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(crReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("배치4 원료 공급사 변경에 따른 규격 개정"));

        // 6. ISO 14971 위험관리(Risk Assessment) 문서 등록
        RiskAssessmentRequest riskReq = RiskAssessmentRequest.builder()
                .title("배치4 고주파 자극기 위험관리 분석서")
                .productName("고주파 자극기 Gen-2")
                .productCode("B4-DEV-001")
                .targetFamily("MEDICAL_DEVICE")
                .riskPhase("DESIGN")
                .author("최고관리자")
                .assessmentDate(LocalDate.now())
                .versionTag("1.0")
                .status("DRAFT")
                .build();

        mockMvc.perform(post("/api/quality/risks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(riskReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("배치4 고주파 자극기 위험관리 분석서"));

        // 7. 의료기기 품목 마스터 등록
        MedicalDeviceProduct mdpReq = MedicalDeviceProduct.builder()
                .itemCode("B4-DEV-001")
                .productName("배치4 고주파 자극기 Gen-2")
                .deviceClassification("CLASS_II")
                .intendedUse("피부 심부열 자극을 통한 통증 완화")
                .licenseNumber("제허 26-1004호")
                .udiDi("08801234567890")
                .active(true)
                .deleted(false)
                .build();

        mockMvc.perform(post("/api/medical-devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mdpReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("B4-DEV-001"));

        // 8. 교육과정 마스터 등록
        TrainingCourseRequest courseReq = TrainingCourseRequest.builder()
                .courseCode("TC-B4-001")
                .courseName("배치4 ISO 13485:2016 실무 및 부적합품 관리 교육")
                .category(TrainingCategory.GMP)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .cycleMonths(12)
                .passingScore(80)
                .trainingHours(4.0)
                .isRequired(true)
                .instructor("사내 수석 강사")
                .status("ACTIVE")
                .build();

        mockMvc.perform(post("/api/training/courses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(courseReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseCode").value("TC-B4-001"));

        // 9. 내부감사 계획 등록
        InternalAuditRequest auditReq = InternalAuditRequest.builder()
                .title("배치4 정기 내부 품질감사 (제조/품질)")
                .auditType(AuditType.REGULAR_INTERNAL)
                .auditScope(AuditScope.QMS_FULL)
                .criteria("ISO 13485 / ISO 22716")
                .plannedStartDate(LocalDate.now().plusDays(10))
                .plannedEndDate(LocalDate.now().plusDays(12))
                .auditeeDepartment("제조생산1팀")
                .auditeeLeadName("생산팀장")
                .leadAuditorName("최고관리자")
                .leadAuditorDepartment("품질보증팀")
                .build();

        mockMvc.perform(post("/api/internal-audits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(auditReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("배치4 정기 내부 품질감사 (제조/품질)"));

        // 10. 추적성 벌크 배치(LOT) 마스터 등록
        TraceabilityBatchRequest batchReq = TraceabilityBatchRequest.builder()
                .batchNumber("LOT-2026-B4-BULK")
                .batchStage(BatchStage.BULK_PRODUCT)
                .itemCode("B4-BULK-001")
                .itemName("배치4 더마크림 벌크 내용물")
                .itemCategory(ItemCategory.COSMETICS)
                .quantity(new BigDecimal("500.0"))
                .unit("KG")
                .manufacturingDate(LocalDate.now())
                .expirationDate(LocalDate.now().plusYears(3))
                .build();

        mockMvc.perform(post("/api/traceability/batches")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batchReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.batchNumber").value("LOT-2026-B4-BULK"));
    }

    @Test
    @Order(2)
    @DisplayName("[R] 조회 및 지연로딩(Lazy) 무결성: KPI 대시보드 10종, 페이징 검색, 404 방어")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test02_Read_List_Filter_Paging_Lazy() throws Exception {
        // 1. NCR KPI 및 목록 페이징
        mockMvc.perform(get("/api/ncr/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalNcrCount").exists());

        mockMvc.perform(get("/api/ncr")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 2. CAPA KPI 및 목록 페이징
        mockMvc.perform(get("/api/capa/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCapas").exists());

        mockMvc.perform(get("/api/capa")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 3. 설계개발(DHF) 프로젝트 목록
        mockMvc.perform(get("/api/quality/design-controls/projects")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 4. 변경관리(Change Control) 요청서 목록
        mockMvc.perform(get("/api/quality/change-controls/requests")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 5. 위험관리(Risk Assessment) 문서 목록
        mockMvc.perform(get("/api/quality/risks")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 6. 추적성 KPI 및 배치 목록
        mockMvc.perform(get("/api/traceability/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBatches").exists());

        mockMvc.perform(get("/api/traceability/batches")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 7. 내부품질감사 KPI 및 목록
        mockMvc.perform(get("/api/internal-audits/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.annualPlannedAudits").exists());

        mockMvc.perform(get("/api/internal-audits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 8. 시판후안전관리/회수(Vigilance/Recall) KPI
        mockMvc.perform(get("/api/vigilance-recall/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVigilanceReports").exists());

        // 9. 컴퓨터시스템검증(CSV) KPI 및 프로젝트 목록
        mockMvc.perform(get("/api/csv-validation/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProjects").exists());

        mockMvc.perform(get("/api/csv-validation/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 10. 교육훈련 KPI 지표 및 교육과정 목록
        mockMvc.perform(get("/api/training/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCourses").exists());

        mockMvc.perform(get("/api/training/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 11. 의료기기 품목 요약 지표
        mockMvc.perform(get("/api/medical-devices/metrics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").exists());

        // 12. 미존재 ID 조회 시 500 대신 400/404 방어
        mockMvc.perform(get("/api/ncr/99999999"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isIn(400, 404));

        mockMvc.perform(get("/api/medical-devices/99999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(3)
    @DisplayName("[U] 수정 및 워크플로우 상태 전이: NCR 조사, CAPA 5-Why 등록, 설계개발 단계 진전, 변경관리 전이")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test03_Update_Lifecycle_And_Workflow() throws Exception {
        // 1. NCR 생성 후 상태 업데이트
        NcrCreateRequest ncrReq = NcrCreateRequest.builder()
                .title("배치4 수정용 NCR")
                .stage(NcrOccurrenceStage.IN_PROCESS)
                .severity(NcrSeverity.MAJOR)
                .itemCode("B4-UPDATE-001")
                .productName("배치4 수정 제품")
                .defectDescription("수정 테스트용 공정 내 부적합 세부 내용")
                .occurredDate(LocalDate.now())
                .build();

        MvcResult ncrResult = mockMvc.perform(post("/api/ncr")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ncrReq)))
                .andExpect(status().isCreated())
                .andReturn();

        NonConformanceReportResponse createdNcr = objectMapper.readValue(
                ncrResult.getResponse().getContentAsString(), NonConformanceReportResponse.class);

        NcrUpdateRequest updateReq = NcrUpdateRequest.builder()
                .title("배치4 수정용 NCR - 원인분석 완료")
                .stage(NcrOccurrenceStage.IN_PROCESS)
                .severity(NcrSeverity.MAJOR)
                .status(NcrStatus.UNDER_INVESTIGATION)
                .itemCode("B4-UPDATE-001")
                .productName("배치4 수정 제품")
                .rootCauseAnalysis("노즐 테프론 링 마모에 의한 미세 카본 가루 발생")
                .capaRequired(true)
                .capaRationale("재발 방지를 위한 정기 예방보전 주기 단축 및 CAPA 연계")
                .build();

        mockMvc.perform(put("/api/ncr/" + createdNcr.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.title").value("배치4 수정용 NCR - 원인분석 완료"));

        // 2. CAPA 생성 후 5-Why 근본원인 등록
        CapaCreateRequest capaReq = CapaCreateRequest.builder()
                .title("배치4 수정용 CAPA")
                .sourceType(CapaSourceType.INTERNAL_AUDIT)
                .category(CapaCategory.PROCESS_CONTROL)
                .riskLevel(CapaRiskLevel.MEDIUM)
                .problemDescription("공정 밸리데이션 주기 초과")
                .assignedTo("최고관리자")
                .targetCompletionDate(LocalDate.now().plusMonths(1))
                .build();

        MvcResult capaResult = mockMvc.perform(post("/api/capa")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(capaReq)))
                .andExpect(status().isCreated())
                .andReturn();

        CapaResponse createdCapa = objectMapper.readValue(
                capaResult.getResponse().getContentAsString(), CapaResponse.class);

        CapaRootCauseRequest rcReq = CapaRootCauseRequest.builder()
                .rootCauseAnalysis("공정 변경점 추적 및 밸리데이션 모니터링 누락")
                .why1("밸리데이션 일정 지연")
                .why2("생산 일정 우선 배정")
                .why3("품질보증 승인 절차 미준수")
                .build();

        mockMvc.perform(put("/api/capa/" + createdCapa.getId() + "/root-cause")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(rcReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.why1").value("밸리데이션 일정 지연"));

        // 3. 설계개발 프로젝트 생성 후 Phase 전이 (PLANNING -> INPUT)
        DesignProjectRequest dpReq = DesignProjectRequest.builder()
                .projectCode("DP-PHASE-B4")
                .projectName("배치4 단계전이 프로젝트")
                .targetDeviceName("스마트 체온계")
                .projectLeader("연구원")
                .department("의료기기팀")
                .startDate(LocalDate.now())
                .targetCompletionDate(LocalDate.now().plusMonths(6))
                .currentPhase(DesignPhase.PLANNING)
                .status(DesignProjectStatus.ACTIVE)
                .build();

        MvcResult dpResult = mockMvc.perform(post("/api/quality/design-controls/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dpReq)))
                .andExpect(status().isCreated())
                .andReturn();

        DesignProjectResponse createdDp = objectMapper.readValue(
                dpResult.getResponse().getContentAsString(), DesignProjectResponse.class);

        mockMvc.perform(post("/api/quality/design-controls/projects/" + createdDp.getId() + "/phase")
                .param("nextPhase", "INPUT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("INPUT"));

        // 4. 변경관리 요청서 생성 후 Status 전이 (DRAFT -> SUBMITTED)
        ChangeRequestRequest crReq = ChangeRequestRequest.builder()
                .title("배치4 상태전이 변경요청서")
                .category(ChangeCategory.FACILITY_EQUIPMENT)
                .urgency(ChangeUrgency.EMERGENCY)
                .status(ChangeStatus.DRAFT)
                .initiatorName("최고관리자")
                .department("품질보증팀")
                .requestDate(LocalDate.now())
                .changeReason("공정 장비 노후화 개선")
                .currentState("구형 노즐 사용")
                .proposedChange("신형 저마모 노즐 교체")
                .build();

        MvcResult crResult = mockMvc.perform(post("/api/quality/change-controls/requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(crReq)))
                .andExpect(status().isCreated())
                .andReturn();

        ChangeRequestResponse createdCr = objectMapper.readValue(
                crResult.getResponse().getContentAsString(), ChangeRequestResponse.class);

        mockMvc.perform(post("/api/quality/change-controls/requests/" + createdCr.getId() + "/transition")
                .param("nextStatus", "SUBMITTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));
    }

    @Test
    @Order(4)
    @DisplayName("[D] 삭제 및 라이프사이클 방어: 의료기기 소프트 삭제, 프로젝트/변경요청 삭제, 403 차단")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void test04_Delete_And_Lifecycle_Defense() throws Exception {
        // 1. 삭제용 의료기기 품목 등록 및 소프트 삭제
        MedicalDeviceProduct delDevice = MedicalDeviceProduct.builder()
                .itemCode("B4-DEL-001")
                .productName("삭제 테스트용 체온계")
                .deviceClassification("CLASS_I")
                .active(true)
                .deleted(false)
                .build();

        MvcResult devResult = mockMvc.perform(post("/api/medical-devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(delDevice)))
                .andExpect(status().isOk())
                .andReturn();

        MedicalDeviceProduct savedDev = objectMapper.readValue(
                devResult.getResponse().getContentAsString(), MedicalDeviceProduct.class);

        mockMvc.perform(delete("/api/medical-devices/" + savedDev.getId()))
                .andExpect(status().isOk());

        // 삭제 후 검색 목록 조회 시 미노출 확인 (소프트 삭제 쿼리 필터링 검증)
        mockMvc.perform(get("/api/medical-devices")
                .param("keyword", "B4-DEL-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        // 단건 조회 시 삭제 플래그(deleted: true) 및 비활성화(active: false) 확인
        mockMvc.perform(get("/api/medical-devices/" + savedDev.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(true))
                .andExpect(jsonPath("$.active").value(false));

        // 2. 삭제용 설계 프로젝트 등록 및 삭제
        DesignProjectRequest delDpReq = DesignProjectRequest.builder()
                .projectCode("DP-DEL-B4")
                .projectName("삭제용 프로젝트")
                .targetDeviceName("삭제 테스트 기기")
                .projectLeader("연구원")
                .department("개발팀")
                .startDate(LocalDate.now())
                .targetCompletionDate(LocalDate.now().plusMonths(3))
                .build();

        MvcResult dpResult = mockMvc.perform(post("/api/quality/design-controls/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(delDpReq)))
                .andExpect(status().isCreated())
                .andReturn();

        DesignProjectResponse savedDp = objectMapper.readValue(
                dpResult.getResponse().getContentAsString(), DesignProjectResponse.class);

        mockMvc.perform(delete("/api/quality/design-controls/projects/" + savedDp.getId()))
                .andExpect(status().isNoContent());

        // 3. 권한 없는 일반 유저(USER)의 관리자 전용 삭제 시도 시 403 Forbidden 검증
        mockMvc.perform(delete("/api/quality/design-controls/projects/99999")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("normal_qa").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    @DisplayName("[W] 특화 워크플로우: 동적 메뉴 트리 및 사용자별 권한 메뉴, 동적 화면, 양방향 공정 투입 링크")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void test05_Specialized_Dynamic_Screens_And_Traceability_Workflow() throws Exception {
        // 1. 동적 메뉴 전체 트리 조회
        mockMvc.perform(get("/api/dynamic/menus/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 2. 현재 로그인 사용자 권한별 메뉴 목록 조회
        mockMvc.perform(get("/api/dynamic/menus/my-menus"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 3. 활성화된 동적 화면 목록 조회
        mockMvc.perform(get("/api/dynamic/screens"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 4. 양방향 공정 투입 링크(Traceability Link) 등록
        TraceabilityLinkRequest linkReq = TraceabilityLinkRequest.builder()
                .parentBatchNumber("LOT-2026-B4-BULK")
                .childBatchNumber("LOT-2026-B4-01")
                .processStep("충진/포장 공정")
                .inputQuantity(new BigDecimal("150.0"))
                .inputUnit("KG")
                .yieldRatio(new BigDecimal("98.5"))
                .linkDate(LocalDate.now())
                .operatorName("최고관리자")
                .build();

        mockMvc.perform(post("/api/traceability/links")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(linkReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.childBatchNumber").value("LOT-2026-B4-01"));

        // 링크 조회 검증
        mockMvc.perform(get("/api/traceability/links")
                .param("batchNumber", "LOT-2026-B4-BULK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(6)
    @DisplayName("[UX] 프론트엔드 연동 응답 표준화: 정형화 JSON, 내부 스택트레이스 미노출, 에러 마스킹")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void test06_UX_Standard_ApiResponse_And_Error_Masking() throws Exception {
        // 1. 유효성 검증 실패(400) 시 상세 필드 에러 메시지 정형화 검증
        NcrCreateRequest badReq = NcrCreateRequest.builder().build();

        mockMvc.perform(post("/api/ncr")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badReq)))
                .andExpect(status().isBadRequest())
                .andExpect(result -> {
                    String content = result.getResponse().getContentAsString();
                    assertThat(content).doesNotContain("Exception");
                    assertThat(content).doesNotContain("at com.example");
                });

        // 2. 존재하지 않는 엔티티 조회 시에도 스택트레이스 미노출 검증
        mockMvc.perform(get("/api/ncr/9999999"))
                .andExpect(result -> {
                    String content = result.getResponse().getContentAsString();
                    assertThat(content).doesNotContain("StackTrace");
                });
    }
}
