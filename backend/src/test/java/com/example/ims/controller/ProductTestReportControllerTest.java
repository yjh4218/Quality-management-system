package com.example.ims.controller;

import com.example.ims.dto.ProductTestReportCreateDto;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductType;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.ProductTestReportRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "com.example.ims.util.SystemStartupRunner.enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
class ProductTestReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductTestReportRepository testReportRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Product testProduct;

    @BeforeEach
    void setUp() {
        testProduct = Product.builder()
                .itemCode("TEST-PROD-MFR-01")
                .productName("제조사 성적서 테스트 제품")
                .productType(ProductType.PET_REGULAR)
                .active(true)
                .deleted(false)
                .build();
        testProduct = productRepository.save(testProduct);
    }

    @Test
    @DisplayName("[TASK-VAL-01] 제조사(ROLE_MANUFACTURER) 계정으로 성적서 등록 API 호출 시 정상 200 반환")
    @WithMockUser(username = "mfr_user", roles = {"MANUFACTURER"})
    void addTestReport_asManufacturer_success() throws Exception {
        ProductTestReportCreateDto dto = ProductTestReportCreateDto.builder()
                .reportName("한국콜마 20261031 시험성적서(COA)")
                .fileName("test_report_mfr.pdf")
                .filePath("/uploads/test_report_mfr.pdf")
                .fileType("application/pdf")
                .build();

        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/test-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reportName").value("한국콜마 20261031 시험성적서(COA)"))
                .andExpect(jsonPath("$.data.fileName").value("test_report_mfr.pdf"));
    }

    @Test
    @DisplayName("품질관리자(ROLE_QUALITY) 계정으로 성적서 등록 API 호출 시 정상 200 반환")
    @WithMockUser(username = "quality_user", roles = {"QUALITY"})
    void addTestReport_asQuality_success() throws Exception {
        ProductTestReportCreateDto dto = ProductTestReportCreateDto.builder()
                .reportName("품질팀 입고 검사성적서")
                .fileName("quality_report.pdf")
                .filePath("/uploads/quality_report.pdf")
                .fileType("application/pdf")
                .build();

        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/test-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("인가되지 않은 역할(ROLE_SALES) 계정으로 성적서 등록 API 호출 시 403 Forbidden 반환")
    @WithMockUser(username = "sales_user", roles = {"SALES"})
    void addTestReport_asUnauthorizedRole_forbidden() throws Exception {
        ProductTestReportCreateDto dto = ProductTestReportCreateDto.builder()
                .reportName("비인가 영업팀 시도")
                .fileName("unauthorized.pdf")
                .filePath("/uploads/unauthorized.pdf")
                .fileType("application/pdf")
                .build();

        mockMvc.perform(post("/api/products/" + testProduct.getId() + "/test-reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("성적서 목록 조회 API는 인증된 사용자에게 200 반환")
    @WithMockUser(username = "any_user", roles = {"MANUFACTURER"})
    void getTestReports_success() throws Exception {
        mockMvc.perform(get("/api/products/" + testProduct.getId() + "/test-reports"))
                .andExpect(status().isOk());
    }
}
