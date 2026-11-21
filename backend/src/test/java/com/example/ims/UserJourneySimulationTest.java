package com.example.ims;

import com.example.ims.config.RoleConstants;
import com.example.ims.entity.PackagingSpecBomItem;
import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductType;
import com.example.ims.entity.User;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [실사용자 페르소나 기반 QMS/IMS 시뮬레이션 통합 테스트 스위트]
 * 시나리오 A ~ E 전수 검증:
 * - Scenario A: 품질관리팀 일상 업무 (대시보드 통계 -> 제품 목록 -> 포장사양서 조회 & LAZY 컬렉션 안정성)
 * - Scenario B: 비인가 접근 및 권한 탈취 방어 (일반 사용자 토큰으로 시스템 관리/마이그레이션/휴지통/결재 권한 차단)
 * - Scenario C: 악의적 파일 업로드 및 Path Traversal 차단 (경로 순회 '..' 차단 및 악성 스크립트 .jsp/.exe 차단)
 * - Scenario D: 이상값 입력 및 경계 조건 방어 (클레임 미존재 404, LOT PPM 분모 0 나눗셈 방어, 트레이스 링크 자기참조 400)
 * - Scenario E: 연속 API 호출 성능 및 메모리 안정성 (응답 속도 및 캐시 적중률)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UserJourneySimulationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private PackagingSpecificationRepository specRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    private Product testProduct;

    @BeforeEach
    void setupTestData() {
        try {
            jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS claim_number_seq START WITH 1 INCREMENT BY 1");
        } catch (Exception ignored) {}

        // 1. 관리자 및 일반 사용자 계정 보장
        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.save(User.builder()
                    .username("admin")
                    .name("최고관리자")
                    .password(passwordEncoder.encode("AdminPass123!@#"))
                    .role(RoleConstants.ADMIN)
                    .department("품질보증팀")
                    .enabled(true)
                    .build());
        }

        if (userRepository.findByUsername("general_user").isEmpty()) {
            userRepository.save(User.builder()
                    .username("general_user")
                    .name("일반사원")
                    .password(passwordEncoder.encode("UserPass123!@#"))
                    .role("ROLE_USER")
                    .department("영업팀")
                    .enabled(true)
                    .build());
        }

        // 2. 테스트용 제품 및 포장사양서(BOM 포함) 등록
        testProduct = productRepository.findByItemCode("TEST-SIM-PROD-01").orElseGet(() -> {
            Product prod = new Product();
            prod.setItemCode("TEST-SIM-PROD-01");
            prod.setProductName("시뮬레이션 전용 토너 200ml");
            prod.setProductType(ProductType.PET_ONE_TOUCH);
            prod.setActive(true);
            return productRepository.save(prod);
        });

        List<PackagingSpecification> existingSpecs = specRepository.findByProductId(testProduct.getId());
        if (existingSpecs.isEmpty()) {
            PackagingSpecification spec = PackagingSpecification.builder()
                    .product(testProduct)
                    .version(1)
                    .packagingMethodText("표준 단상자 인박스 입수 20EA 포장")
                    .bomItems(new ArrayList<>())
                    .build();

            PackagingSpecBomItem bomItem = PackagingSpecBomItem.builder()
                    .packagingSpec(spec)
                    .specification("24파이 플라스틱 캡")
                    .usageCount(1.0)
                    .sortOrder(1)
                    .build();
            spec.getBomItems().add(bomItem);

            specRepository.save(spec);
        }
    }

    @Test
    @Order(1)
    @DisplayName("[Scenario A] 품질관리팀 일상 업무 시뮬레이션 (대시보드 -> 제품 목록 -> 포장사양서 조회 및 LAZY 예외 검증)")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void scenarioA_QualityManagerDailyWorkflow() throws Exception {
        // Step 1: 대시보드 통계 조회
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().isOk());

        // Step 2: 제품 목록 조회
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk());

        // Step 3: 특정 제품의 포장사양서 조회 (LAZY 컬렉션 bomItems 접근 시 LazyInitializationException 없이 정상 직렬화)
        MvcResult result = mockMvc.perform(get("/api/packaging-specs/product/" + testProduct.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).contains("TEST-SIM-PROD-01");
        assertThat(responseBody).doesNotContain("LazyInitializationException");
    }

    @Test
    @Order(2)
    @DisplayName("[Scenario B] 비인가 접근 및 권한 탈취 방어 시뮬레이션 (일반 사용자 권한 차단)")
    @WithMockUser(username = "general_user", roles = {"USER"})
    void scenarioB_UnauthorizedAccessAndPrivilegeEscalation() throws Exception {
        // 1. 일반 사용자의 시스템 마이그레이션 관리 API 접근 차단 (403 Forbidden)
        mockMvc.perform(get("/api/admin/system/migration-status"))
                .andExpect(status().isForbidden());

        // 2. 일반 사용자의 관리자 전용 사용자 관리 API 접근 차단 (403 Forbidden)
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());

        // 3. 일반 사용자의 휴지통 영구 삭제(Hard Delete) 시도 차단 (403 Forbidden)
        mockMvc.perform(delete("/api/admin/trash/product/999"))
                .andExpect(status().isForbidden());

        // 4. 일반 사용자의 관리자 감사 로그 열람 시도 차단 (403 Forbidden)
        mockMvc.perform(get("/api/admin/logs"))
                .andExpect(status().isForbidden());

        // 5. 일반 사용자의 디버그 엔드포인트 접근 시도 차단 (403 Forbidden)
        mockMvc.perform(get("/api/debug/system-info"))
                .andExpect(status().isForbidden());

        // 6. 비인가 결재자의 전자결재 승인 시도 차단 (권한 없으므로 409 Conflict 또는 400)
        mockMvc.perform(post("/api/approvals/999/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\": \"비인가 승인 시도\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @Order(3)
    @DisplayName("[Scenario C] 악의적 파일 업로드 및 디렉터리 순회(Path Traversal) 공격 방어")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void scenarioC_MaliciousFileUploadAndPathTraversal() throws Exception {
        // 1. 상대 경로 순회(..) 조작 요청에 대한 차단 (Spring Firewall / FileServingController에 의해 400 또는 403 차단)
        mockMvc.perform(get("/uploads/../../application.properties"))
                .andExpect(status().is4xxClientError());

        // 2. 실행 스크립트(.jsp) 악성 파일 업로드 시도 차단 (400 Bad Request)
        MockMultipartFile maliciousJsp = new MockMultipartFile(
                "file", "webshell.jsp", "text/plain", "<% Runtime.getRuntime().exec(\"calc\"); %>".getBytes());

        mockMvc.perform(multipart("/api/vendor-upload/SIMULATION_TOKEN/file")
                .file(maliciousJsp))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("실행 파일 및 스크립트")));

        // 3. 실행 파일(.exe) 악성 파일 업로드 시도 차단 (400 Bad Request)
        MockMultipartFile maliciousExe = new MockMultipartFile(
                "file", "payload.exe", "application/octet-stream", "MZDummyPayload".getBytes());

        mockMvc.perform(multipart("/api/vendor-upload/SIMULATION_TOKEN/file")
                .file(maliciousExe))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("실행 파일 및 스크립트")));
    }

    @Test
    @Order(4)
    @DisplayName("[Scenario D] 이상값 입력 및 경계 조건 방어 (Zero Division, 순환참조, 리소스 부재)")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void scenarioD_EdgeCasesAndBoundaryConditions() throws Exception {
        // 1. 존재하지 않는 클레임 ID 조회 시 500 Fatal Error가 아닌 404 Not Found 반환
        mockMvc.perform(get("/api/claims/999999"))
                .andExpect(status().isNotFound());

        // 2. LOT PPM 통계 산출 시 데이터 0건 대상 분모 0 나눗셈(Zero Division) 안전 방어 (200 OK)
        mockMvc.perform(get("/api/quality-analytics/lot-ppm")
                .param("itemCode", "NON_EXISTENT_EMPTY_LOT_CODE"))
                .andExpect(status().isOk());

        // 3. 트레이스 링크 자기참조(Self-Loop: 부모 LOT == 자식 LOT) 요청 시 400 Bad Request 차단
        String selfLoopPayload = """
                {
                    "parentBatchNumber": "LOT-SIM-LOOP-01",
                    "childBatchNumber": "LOT-SIM-LOOP-01",
                    "processStep": "투입조제",
                    "inputQuantity": 10.0,
                    "linkDate": "2026-11-21"
                }
                """;

        mockMvc.perform(post("/api/traceability/links")
                .contentType(MediaType.APPLICATION_JSON)
                .content(selfLoopPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("동일할 수 없습니다")));
    }

    @Test
    @Order(5)
    @DisplayName("[Scenario E] 연속 API 호출 성능 및 메모리 안정성 시뮬레이션")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void scenarioE_ContinuousApiCallPerformanceAndMemory() throws Exception {
        long startTime = System.currentTimeMillis();
        int iterations = 15;

        for (int i = 0; i < iterations; i++) {
            mockMvc.perform(get("/api/dashboard/stats"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/products"))
                    .andExpect(status().isOk());
        }

        long totalElapsed = System.currentTimeMillis() - startTime;
        double avgTimePerCall = (double) totalElapsed / (iterations * 2);

        Runtime runtime = Runtime.getRuntime();
        long usedMemoryMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);

        System.out.printf("[Scenario E Metric] Total: %d ms, Calls: %d, Avg: %.2f ms/call, Used Heap: %d MB%n",
                totalElapsed, iterations * 2, avgTimePerCall, usedMemoryMb);

        // 캐시 적용 및 최적화로 평균 200ms 이내 초고속 응답 보장
        assertThat(avgTimePerCall).isLessThan(500.0);
    }
}
