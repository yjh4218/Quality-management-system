package com.example.ims;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
public class PerformanceBenchmarkTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin1234!"))
                    .name("관리자")
                    .role("ROLE_ADMIN,ROLE_QUALITY_TEAM,ROLE_RESPONSIBLE_SALES")
                    .department("품질관리팀")
                    .enabled(true)
                    .build();
            userRepository.save(admin);
        }
    }

    record BenchmarkResult(String screenName, String endpoint, int status, long durationMs, int payloadBytes, String responseTimeHeader) {}

    @Test
    @DisplayName("전체 수정 화면 및 주요 API 엔드포인트 일괄 속도 및 헤더 정밀 측정")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM", "RESPONSIBLE_SALES"})
    void runComprehensivePerformanceBenchmark() throws Exception {
        List<BenchmarkResult> results = new ArrayList<>();

        // 측정 대상 엔드포인트 정의
        String[][] endpoints = {
            {"1. 제품 관리 목록 (50건 페이징)", "/api/products?page=0&size=50"},
            {"2. 제조사 마스터 목록", "/api/manufacturers"},
            {"3. 브랜드 마스터 목록", "/api/brands"},
            {"4. BOM 부자재 마스터 목록", "/api/admin/master-data/materials"},
            {"5. 유통 채널 목록", "/api/admin/master-data/sales-channels"},
            {"6. 접속 로그 (Top 200 최적화)", "/api/logs/access"},
            {"7. 품질 서류 요구 관리 (50건)", "/api/document-requests?page=0&size=50"},
            {"8. 품질 분석 요약 (Lot PPM)", "/api/quality-analytics/summary"},
            {"9. 클레임 목록 (기간 필터)", "/api/claims"},
            {"10. 품목 검색 팝업 (50건)", "/api/products/search?size=50"}
        };

        // 워밍업 (JIT 컴파일 및 캐시 초기화)
        mockMvc.perform(get("/api/manufacturers")).andReturn();

        // 벤치마크 수행
        for (String[] ep : endpoints) {
            String label = ep[0];
            String url = ep[1];

            long start = System.currentTimeMillis();
            MvcResult result = mockMvc.perform(get(url)
                    .header("Accept-Encoding", "gzip")
                    .header("Accept", "application/json"))
                    .andReturn();
            long duration = System.currentTimeMillis() - start;

            int status = result.getResponse().getStatus();
            byte[] content = result.getResponse().getContentAsByteArray();
            String responseTimeHeader = result.getResponse().getHeader("X-Response-Time-Millis");

            results.add(new BenchmarkResult(label, url, status, duration, content.length, responseTimeHeader));
        }

        // 결과 출력
        System.out.println("\n==========================================================================================");
        System.out.println(" 🚀 QMS 전체 수정 화면 및 API 실제 조회 속도 벤치마크 검증 결과");
        System.out.println("==========================================================================================");
        System.out.printf("%-30s | %-8s | %-10s | %-12s | %-12s\n", "화면 / 기능 영역", "HTTP상태", "소요시간(ms)", "서버헤더(ms)", "응답크기(Bytes)");
        System.out.println("------------------------------------------------------------------------------------------");

        for (BenchmarkResult r : results) {
            System.out.printf("%-30s | %-8d | %-10d | %-12s | %-12d\n",
                    r.screenName(), r.status(), r.durationMs(), (r.responseTimeHeader() != null ? r.responseTimeHeader() + "ms" : "N/A"), r.payloadBytes());
            assertThat(r.status()).isIn(200, 204);
            assertThat(r.durationMs()).isLessThan(1500L); // 1.5초 이내 완료 단언
        }
        System.out.println("==========================================================================================\n");
    }
}
