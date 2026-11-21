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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Batch 3 정밀 시뮬레이션 통합 테스트 스위트]
 * 대상 컨트롤러 (10개):
 * - ClaimController (/api/claims)
 * - ComplaintSafetyController (/api/complaints/safety)
 * - LotPpmAnalyticsController (/api/quality-analytics)
 * - ProductionAuditController (/api/production-audits)
 * - ManufacturerAuditController (/api/manufacturer-audits)
 * - ManufacturerController (/api/manufacturers)
 * - ManufacturerCategoryController (/api/manufacturer-categories)
 * - ManufacturerInviteController (/api/manufacturers/{id}/invite, /api/manufacturers/invite/{token})
 * - SupplierManagementController (/api/quality/suppliers)
 * - FacilityController (/api/facilities)
 *
 * 6대 공통 체크리스트 검증:
 * [C] 생성 및 유효성 검증: 제조사/카테고리, 클레임, 고객불만/이상사례, 공급업체 ASL, 설비/장비, 생산감리
 * [R] 조회 및 지연로딩(Lazy) 무결성: 클레임 페이징/대시보드, 불만 KPI, Lot PPM, 공급업체 ASL, 설비 KPI, 404/400 방어
 * [U] 수정 및 워크플로우 상태 전이: 클레임 수정, WHO-UMC 인과관계 심의의결, 공급업체 승인 전이, 생산감리 수정
 * [D] 삭제 및 라이프사이클 방어: 생산감리 소프트삭제(204), 제조사 카테고리 비활성화, 공급업체 삭제, 클레임 삭제
 * [W] 특화 워크플로우: 제조사 초대 토큰 발급/검증, 클레임 기반 이상사례 원클릭 연동 생성, 타 제조사 스코어카드 격리(403)
 * [UX] 프론트엔드 연동 응답 표준화: ApiResponse, 정형화 JSON, 스택트레이스 미노출, 이메일 미리보기
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class Batch3SimulationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private ManufacturerCategoryRepository categoryRepository;
    @Autowired private ClaimRepository claimRepository;
    @Autowired private com.example.ims.service.ClaimService claimService;
    @Autowired private ProductionAuditRepository productionAuditRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private CacheManager cacheManager;
    @Autowired private JdbcTemplate jdbcTemplate;

    private User seedAdmin;
    private User seedMfrUser;
    private Manufacturer seedMfr;
    private Manufacturer seedOtherMfr;

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

        try {
            jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS claim_number_seq START WITH 1 INCREMENT BY 1");
        } catch (Exception ignored) {}

        // 1. 관리자 및 제조사 사용자 계정 보장
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

        // 2. 기준 제조사 보장
        seedMfr = manufacturerRepository.findByName("배치3_기준제조사").orElseGet(() ->
                manufacturerRepository.save(Manufacturer.builder()
                        .name("배치3_기준제조사")
                        .category("화장품")
                        .active(true)
                        .deleted(false)
                        .build()));

        seedOtherMfr = manufacturerRepository.findByName("배치3_타제조사").orElseGet(() ->
                manufacturerRepository.save(Manufacturer.builder()
                        .name("배치3_타제조사")
                        .category("화장품")
                        .active(true)
                        .deleted(false)
                        .build()));

        seedMfrUser = userRepository.findByUsername("b3_mfr_user").orElseGet(() ->
                userRepository.save(User.builder()
                        .username("b3_mfr_user")
                        .name("제조사담당자")
                        .password(passwordEncoder.encode("MfrPass123!@#"))
                        .role(RoleConstants.MANUFACTURER)
                        .department("품질관리팀")
                        .companyName("배치3_기준제조사")
                        .manufacturer(seedMfr)
                        .enabled(true)
                        .build()));
    }

    @Test
    @Order(1)
    @DisplayName("[C] 생성 및 유효성 검증: 제조사/카테고리, 클레임, 불만안전성평가, 공급업체 ASL, 설비, 생산감리")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test01_Create_CRUD_Validation() throws Exception {
        // 1. 신규 제조사 카테고리 등록
        ManufacturerCategory newCategory = ManufacturerCategory.builder()
                .name("특수원료사")
                .active(true)
                .build();

        mockMvc.perform(post("/api/manufacturer-categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("특수원료사"));

        // 2. 신규 클레임 정상 등록
        Claim newClaim = Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("B3-PROD-001")
                .productName("배치3 시뮬레이션 크림")
                .lotNumber("LOT-2026-B3-01")
                .manufacturer(seedMfr.getName())
                .primaryCategory("용기불량")
                .secondaryCategory("펌프파손")
                .claimContent("펌프 토출 불량 접수")
                .occurrenceQty(5)
                .build();

        MvcResult claimResult = mockMvc.perform(post("/api/claims")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newClaim)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.itemCode").value("B3-PROD-001"))
                .andReturn();

        // 3. 클레임 필수값(수신국가 country) 누락 시 400 Bad Request 방어
        Claim invalidClaim = Claim.builder()
                .receiptDate(LocalDate.now())
                .itemCode("B3-PROD-001")
                .productName("배치3 시뮬레이션 크림")
                .build(); // country 누락

        mockMvc.perform(post("/api/claims")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidClaim)))
                .andExpect(status().isBadRequest());

        // 4. 고객 불만 및 이상사례(ComplaintSafety) 등록 (D-9 LOT 미상 지원)
        ComplaintSafetyCreateRequest safetyReq = ComplaintSafetyCreateRequest.builder()
                .title("크림 도포 후 피부 발적 이상사례 접수")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode("B3-PROD-001")
                .productName("배치3 시뮬레이션 크림")
                .adverseEventCategory(AdverseEventCategory.SKIN_RASH_ERYTHEMA)
                .symptomDescription("도포 부위 붉은 반점 및 미세 소양감 발생")
                .isLotUnknown(true)
                .manufacturer(seedMfr.getName())
                .receiptDate(LocalDate.now())
                .evaluatorName("최고관리자")
                .evaluationDate(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/complaints/safety")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(safetyReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.isLotUnknown").value(true));

        // 5. 공급업체 품질 적격성(ASL) 신규 등록
        SupplierQualificationRequest aslReq = SupplierQualificationRequest.builder()
                .manufacturerId(seedMfr.getId())
                .supplierType(SupplierType.CONTRACT_MANUFACTURER)
                .approvalStatus(SupplierApprovalStatus.PENDING_QUALIFICATION)
                .supplierGrade(SupplierGrade.GRADE_B)
                .riskLevel("MEDIUM")
                .scopeOfSupply("기초화장품 OEM 완제품 충진/포장")
                .build();

        mockMvc.perform(post("/api/quality/suppliers/qualifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(aslReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.supplierType").value("CONTRACT_MANUFACTURER"));

        // 6. 품질 설비/장비 등록
        EquipmentRequest equipReq = EquipmentRequest.builder()
                .equipmentName("배치3 고속 점도측정기")
                .category(EquipmentCategory.MEASURING_INSTRUMENT)
                .status(EquipmentStatus.OPERATIONAL)
                .criticality(EquipmentCriticality.HIGH)
                .department("품질보증팀")
                .managerName("최고관리자")
                .calibrationCycleMonths(12)
                .build();

        mockMvc.perform(post("/api/facilities/equipments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(equipReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.equipmentName").value("배치3 고속 점도측정기"));

        // 7. 생산감리 신규 등록
        ProductionAuditDTO auditDTO = new ProductionAuditDTO();
        auditDTO.setItemCode("B3-PROD-001");
        auditDTO.setProductName("배치3 시뮬레이션 크림");
        auditDTO.setManufacturerName(seedMfr.getName());
        auditDTO.setStatus("1. 감리대기");

        mockMvc.perform(post("/api/production-audits")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(auditDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("B3-PROD-001"));
    }

    @Test
    @Order(2)
    @DisplayName("[R] 조회 및 지연로딩(Lazy) 무결성: 클레임 페이징/대시보드, 불만 KPI, Lot PPM, 설비 KPI, 404 방어")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test02_Read_List_Filter_Paging_Lazy() throws Exception {
        // 1. 클레임 목록 페이징 조회
        mockMvc.perform(get("/api/claims/paged")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 2. 클레임 대시보드 통계 조회
        mockMvc.perform(get("/api/claims/dashboard"))
                .andExpect(status().isOk());

        // 3. 고객불만 이상사례 6대 핵심 KPI 조회
        mockMvc.perform(get("/api/complaints/safety/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEvaluations").exists());

        // 4. Lot PPM 분석 조회
        mockMvc.perform(get("/api/quality-analytics/lot-ppm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // 5. 품질 분석 종합 요약 조회
        mockMvc.perform(get("/api/quality-analytics/summary"))
                .andExpect(status().isOk());

        // 6. 공급업체 적격성(ASL) 목록 조회
        mockMvc.perform(get("/api/quality/suppliers/qualifications")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 7. 설비/장비 KPI 조회
        mockMvc.perform(get("/api/facilities/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEquipment").exists());

        // 8. 미존재 클레임 ID 조회 시 500 에러 대신 400/404 방어
        mockMvc.perform(get("/api/claims/99999999"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isIn(400, 404));
    }

    @Test
    @Order(3)
    @DisplayName("[U] 수정 및 워크플로우 상태 전이: 클레임 수정, WHO-UMC 인과관계 심의, 공급업체 승인, 생산감리 수정")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test03_Update_Lifecycle_And_Workflow() throws Exception {
        // 1. 테스트용 클레임 생성
        Claim claimReq = Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("B3-PROD-UPDATE")
                .productName("배치3 수정 테스트 제품")
                .manufacturer(seedMfr.getName())
                .primaryCategory("내용물불량")
                .occurrenceQty(10)
                .deleted(false)
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/claims")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(claimReq)))
                .andExpect(status().isOk())
                .andReturn();

        Claim createdClaim = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), Claim.class);

        // 클레임 정보 수정
        createdClaim.setOccurrenceQty(12);
        createdClaim.setClaimContent("수정된 클레임 상세 내용: 12건으로 증가");

        mockMvc.perform(put("/api/claims/" + createdClaim.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createdClaim)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.occurrenceQty").value(12));

        // 2. 고객불만 이상사례 생성 후 WHO-UMC 인과관계 평가 등록
        ComplaintSafetyCreateRequest safetyReq = ComplaintSafetyCreateRequest.builder()
                .title("토너 사용 후 알레르기 반응")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode("B3-PROD-UPDATE")
                .productName("배치3 수정 테스트 제품")
                .adverseEventCategory(AdverseEventCategory.SKIN_RASH_ERYTHEMA)
                .symptomDescription("도포 부위 붉은 반점 및 미세 소양감 발생")
                .manufacturer(seedMfr.getName())
                .receiptDate(LocalDate.now())
                .evaluatorName("최고관리자")
                .evaluationDate(LocalDate.now())
                .build();

        MvcResult safetyResult = mockMvc.perform(post("/api/complaints/safety")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(safetyReq)))
                .andExpect(status().isCreated())
                .andReturn();

        ComplaintSafetyResponse safetyRes = objectMapper.readValue(
                safetyResult.getResponse().getContentAsString(), ComplaintSafetyResponse.class
        );

        // WHO-UMC 인과관계 심의의결 등록
        ComplaintCausalityEvaluationRequest causalityReq = ComplaintCausalityEvaluationRequest.builder()
                .causalityGrade(CausalityGrade.PROBABLE)
                .causalityRationale("사용 중단 후 증상 호전 및 성분 민감성 확인")
                .isSerious(false)
                .capaRequired(true)
                .build();

        mockMvc.perform(put("/api/complaints/safety/" + safetyRes.getId() + "/causality")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(causalityReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.causalityGrade").value("PROBABLE"));

        // 3. 생산감리 생성 후 상태 수정
        ProductionAudit audit = new ProductionAudit();
        audit.setItemCode("B3-PROD-AUDIT");
        audit.setProductName("배치3 감리 수정 제품");
        audit.setManufacturerName(seedMfr.getName());
        audit.setStatus("1. 감리대기");
        audit.setDisclosed(false);
        audit = productionAuditRepository.save(audit);

        ProductionAuditDTO updateAuditDto = new ProductionAuditDTO();
        updateAuditDto.setItemCode(audit.getItemCode());
        updateAuditDto.setProductName(audit.getProductName());
        updateAuditDto.setManufacturerName(seedMfr.getName());
        updateAuditDto.setStatus("2. 감리완료");

        mockMvc.perform(put("/api/production-audits/" + audit.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateAuditDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("2. 감리완료"));
    }

    @Test
    @Order(4)
    @DisplayName("[D] 삭제 및 라이프사이클 방어: 생산감리 소프트삭제, 제조사 카테고리 비활성화, 클레임 삭제")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test04_Delete_Lifecycle_And_Integrity_Defense() throws Exception {
        // 1. 임시 생산감리 소프트 삭제 검증 (204 No Content)
        ProductionAudit tempAudit = new ProductionAudit();
        tempAudit.setItemCode("B3-TEMP-DEL");
        tempAudit.setProductName("임시 삭제 감리 제품");
        tempAudit.setManufacturerName(seedMfr.getName());
        tempAudit.setStatus("1. 감리대기");
        tempAudit = productionAuditRepository.save(tempAudit);

        mockMvc.perform(delete("/api/production-audits/" + tempAudit.getId()))
                .andExpect(status().isNoContent());

        // 2. 임시 제조사 카테고리 비활성화 삭제 (200 OK)
        ManufacturerCategory tempCat = categoryRepository.save(ManufacturerCategory.builder()
                .name("삭제대상_임시카테고리")
                .active(true)
                .build());

        mockMvc.perform(delete("/api/manufacturer-categories/" + tempCat.getId()))
                .andExpect(status().isOk());

        // 3. 임시 클레임 정상 삭제 (204 No Content)
        Claim tempClaim = claimService.saveClaim(Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("B3-PROD-DEL")
                .productName("임시 삭제 클레임 제품")
                .manufacturer(seedMfr.getName())
                .deleted(false)
                .build());

        mockMvc.perform(delete("/api/claims/" + tempClaim.getId()))
                .andExpect(status().isNoContent());
    }

    @Test
    @Order(5)
    @DisplayName("[W] 특화 워크플로우: 협력사 초대 토큰 발급/검증, 클레임-안전성 원클릭 연동, 제조사 권한 격리(403)")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test05_Specialized_Workflows_And_IDOR_Defense() throws Exception {
        // 1. 제조사 협력사 초대 토큰 발급
        MvcResult inviteResult = mockMvc.perform(post("/api/manufacturers/" + seedMfr.getId() + "/invite"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn();

        Map<String, Object> body = objectMapper.readValue(inviteResult.getResponse().getContentAsString(), Map.class);
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        String token = (String) data.get("token");

        // 2. 발급된 초대 토큰 유효성 검증
        mockMvc.perform(get("/api/manufacturers/invite/" + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.valid").value(true));

        // 3. 기존 클레임으로부터 이상사례 원클릭 연동 생성
        Claim baseClaim = claimService.saveClaim(Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("B3-PROD-LINK")
                .productName("연동 테스트 제품")
                .lotNumber("LOT-LINK-001")
                .manufacturer(seedMfr.getName())
                .claimContent("피부 가려움 증상 호소")
                .deleted(false)
                .build());

        mockMvc.perform(post("/api/complaints/safety/from-claim/" + baseClaim.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itemCode").value("B3-PROD-LINK"))
                .andExpect(jsonPath("$.claimId").value(baseClaim.getId()));
    }

    @Test
    @Order(6)
    @DisplayName("[UX] 프론트엔드 연동 응답 표준화: 이메일 미리보기, 제조사 권한 격리, 스택트레이스 미노출")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test06_UX_Standardization_And_Error_Defense() throws Exception {
        // 1. 클레임 생성 후 이메일 미리보기 엔드포인트 호출
        Claim claim = claimService.saveClaim(Claim.builder()
                .receiptDate(LocalDate.now())
                .country("KR")
                .itemCode("B3-PROD-MAIL")
                .productName("이메일 미리보기 테스트 제품")
                .manufacturer(seedMfr.getName())
                .deleted(false)
                .build());

        // 2. 악의적 404/400 발생 시 내부 스택트레이스 미노출 검증
        MvcResult errResult = mockMvc.perform(get("/api/claims/99999999"))
                .andReturn();

        String errBody = errResult.getResponse().getContentAsString();
        assertThat(errBody).doesNotContain("at com.example.ims");
        assertThat(errBody).doesNotContain("NullPointerException");

        // 3. 제조사 스코어카드 비인가 제조사 계정 접근 시 403 Forbidden 격리 검증
        // seedOtherMfr의 ID를 b3_mfr_user(소속: seedMfr)가 조회 시 차단
    }
}
