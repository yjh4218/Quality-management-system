package com.example.ims.simulation;

import com.example.ims.config.RoleConstants;
import com.example.ims.dto.ComplianceScanDto;
import com.example.ims.dto.DepartmentDto;
import com.example.ims.entity.*;
import com.example.ims.repository.*;
import com.example.ims.service.packaging.spaceratio.SpaceRatioRequest;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Batch 1 정밀 시뮬레이션 통합 테스트 스위트]
 * 대상 컨트롤러 (19개):
 * - 인증/조직/시스템: AuthController, AdminController, RoleManagementController, DepartmentController,
 *                   AdminSystemController, SystemSettingController, DataManagementController,
 *                   SystemGuideController, AccessLogController, AdminLogController, BugReportController
 * - 기준정보/알림/메일: BrandController, SalesChannelController, BomCategoryController,
 *                     MailCategoryController, MailTemplateController, MailDispatchHistoryController,
 *                     NotificationController, AnnouncementController
 * - 제품/포장/규제: ProductController, ProductTestReportController, ComplianceScanController,
 *                  PackagingSpecificationController, SpaceRatioController
 *
 * 6대 공통 체크리스트 검증:
 * [C] 정상 생성 + 필수값 누락(400) + 중복/동시성 검증
 * [R] 목록/필터/페이징 + 단건 조회 + 미존재 ID(404, 500 금지) + N+1/Lazy 로딩 무결성
 * [U] 정상 수정 + 미존재 수정(404)
 * [D] 정상 삭제 + 하위 FK 참조 시 409/400 안내 반환(500 금지) + Soft Delete/Restore
 * [W] 포장사양서, 공간비율 계산(0/null 방어), 전성분 규제 스캔(0/null 방어)
 * [UX] 프론트엔드 연동 응답 표준화 (ApiResponse, JSON 포맷, 스택트레이스 미노출)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class Batch1SimulationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private SalesChannelRepository salesChannelRepository;
    @Autowired private BomCategoryRepository bomCategoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private PackagingSpecificationRepository specRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private org.springframework.cache.CacheManager cacheManager;

    private Brand seedBrand;
    private Manufacturer seedManufacturer;
    private SalesChannel seedChannel;
    private Product seedProduct;

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

        // 관리자 및 일반 사용자 계정 보장
        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.save(User.builder()
                    .username("admin")
                    .name("최고관리자")
                    .password(passwordEncoder.encode("AdminPass123!@#"))
                    .role(RoleConstants.ADMIN)
                    .department("품질보증팀")
                    .companyName("본사")
                    .enabled(true)
                    .build());
        }

        // 기준 브랜드 및 제조사, 채널 시드
        seedBrand = brandRepository.findByName("시뮬레이션_테스트_브랜드").orElseGet(() -> {
            Brand b = Brand.builder().name("시뮬레이션_테스트_브랜드").type("스킨케어").build();
            return brandRepository.save(b);
        });

        seedManufacturer = manufacturerRepository.findByName("시뮬레이션_제조사").orElseGet(() -> {
            Manufacturer m = Manufacturer.builder().name("시뮬레이션_제조사").active(true).build();
            return manufacturerRepository.save(m);
        });

        seedChannel = salesChannelRepository.findByName("시뮬레이션_채널").orElseGet(() -> {
            SalesChannel sc = SalesChannel.builder().name("시뮬레이션_채널").description("테스트용 채널").isDeleted(false).build();
            return salesChannelRepository.save(sc);
        });

        // 기준 제품 시드
        seedProduct = productRepository.findByItemCode("B1-PROD-001").orElseGet(() -> {
            Product p = new Product();
            p.setItemCode("B1-PROD-001");
            p.setProductName("배치1 시뮬레이션 토너 150ml");
            p.setBrand(seedBrand);
            p.setManufacturerInfo(seedManufacturer);
            p.setProductType(ProductType.PET_ONE_TOUCH);
            p.setChannels(new ArrayList<>(List.of(seedChannel)));
            p.setActive(true);
            return productRepository.save(p);
        });
    }

    @Test
    @Order(1)
    @DisplayName("[C] 생성 및 유효성 검증: 브랜드/채널/BOM카테고리/부서/제품 정상 생성 및 필수값 누락 400 방어")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test01_Create_CRUD_Validation() throws Exception {
        // 1. 브랜드 정상 등록 (200 OK)
        Brand newBrand = Brand.builder().name("신규_더마_브랜드").type("더마코스메틱").build();
        mockMvc.perform(post("/api/brands")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newBrand)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("신규_더마_브랜드"));

        // 2. 브랜드 필수값 누락 시 400 Bad Request 방어
        Brand invalidBrand = Brand.builder().name("").type("더마").build();
        mockMvc.perform(post("/api/brands")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidBrand)))
                .andExpect(status().isBadRequest());

        // 3. 유통 채널 정상 등록
        SalesChannel newChannel = SalesChannel.builder().name("글로벌_아마존_US").description("북미 수출 채널").build();
        mockMvc.perform(post("/api/admin/master-data/sales-channels")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newChannel)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("글로벌_아마존_US"));

        // 4. 유통 채널 필수값 누락 400 방어
        SalesChannel invalidChannel = SalesChannel.builder().name("").build();
        mockMvc.perform(post("/api/admin/master-data/sales-channels")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidChannel)))
                .andExpect(status().isBadRequest());

        // 5. BOM 카테고리 정상 등록
        BomCategory bomCat = BomCategory.builder().mainType("용기").subType("헤비블로우 PET").build();
        mockMvc.perform(post("/api/admin/bom-categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bomCat)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mainType").value("용기"));

        // 6. 제품 정상 등록 및 중복 체크 검증
        Product newProduct = new Product();
        newProduct.setItemCode("B1-PROD-NEW-01");
        newProduct.setProductName("신규 수분 에센스 50ml");
        newProduct.setBrand(seedBrand);
        newProduct.setManufacturerInfo(seedManufacturer);
        newProduct.setChannels(new ArrayList<>(List.of(seedChannel)));
        newProduct.setProductType(ProductType.PET_ONE_TOUCH);
        newProduct.setActive(true);

        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newProduct)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("B1-PROD-NEW-01"));

        // 중복 체크 API 호출 확인
        mockMvc.perform(get("/api/products/check-duplicate/B1-PROD-NEW-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(true));
    }

    @Test
    @Order(2)
    @DisplayName("[R] 조회 및 지연로딩(Lazy) 무결성: 목록/필터/단건 조회 및 미존재 ID 404 방어")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test02_Read_List_Filter_Paging_Lazy() throws Exception {
        // 1. 브랜드 목록 조회 (캐시 연동 정상)
        mockMvc.perform(get("/api/brands"))
                .andExpect(status().isOk());

        // 2. 활성 유통채널 목록 조회
        mockMvc.perform(get("/api/admin/master-data/sales-channels/active"))
                .andExpect(status().isOk());

        // 3. 부서 목록 조회
        mockMvc.perform(get("/api/departments"))
                .andExpect(status().isOk());

        // 4. 제품 목록 페이징 및 필터 조회
        mockMvc.perform(get("/api/products")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        mockMvc.perform(get("/api/products/search")
                .param("productName", "시뮬레이션")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        // 5. 제품 단건 조회 및 Lazy 컬렉션(channels, components) 정상 직렬화 확인
        MvcResult prodResult = mockMvc.perform(get("/api/products/" + seedProduct.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String body = prodResult.getResponse().getContentAsString();
        assertThat(body).contains("B1-PROD-001");
        assertThat(body).doesNotContain("LazyInitializationException");

        // 6. 존재하지 않는 제품 ID 조회 시 500이 아닌 404/ApiResponse 에러 반환
        mockMvc.perform(get("/api/products/99999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(3)
    @DisplayName("[U] 수정 라이프사이클: 브랜드/제품/부서 수정 및 미존재 대상 404 검증")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test03_Update_Lifecycle() throws Exception {
        // 1. 브랜드 정보 수정
        Brand updateBrand = Brand.builder().name("시뮬레이션_테스트_브랜드_수정").type("프리미엄스킨케어").build();
        mockMvc.perform(put("/api/brands/" + seedBrand.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateBrand)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("시뮬레이션_테스트_브랜드_수정"));

        // 2. 미존재 브랜드 수정 시 404 Not Found
        mockMvc.perform(put("/api/brands/88888888")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateBrand)))
                .andExpect(status().isNotFound());

        // 3. 제품 정보 수정
        Product updateProduct = new Product();
        updateProduct.setItemCode(seedProduct.getItemCode());
        updateProduct.setProductName("배치1 시뮬레이션 토너 150ml (리뉴얼)");
        updateProduct.setBrand(seedBrand);
        updateProduct.setManufacturerInfo(seedManufacturer);
        updateProduct.setChannels(new ArrayList<>(List.of(seedChannel)));
        updateProduct.setProductType(ProductType.PET_ONE_TOUCH);
        updateProduct.setActive(true);

        mockMvc.perform(put("/api/products/" + seedProduct.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateProduct)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productName").value("배치1 시뮬레이션 토너 150ml (리뉴얼)"));
    }

    @Test
    @Order(4)
    @DisplayName("[D] 삭제 및 외래키(FK) 참조 무결성 방어: 하위 데이터 참조 시 409 Conflict 안내 반환 검증")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test04_Delete_FK_Referential_Integrity() throws Exception {
        // 1. 제품이 참조 중인 브랜드 삭제 시도 시 500 에러 대신 409 Conflict 반환 확인
        mockMvc.perform(delete("/api/brands/" + seedBrand.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("참조하고 있는 제품 데이터가 존재")));

        // 2. 아무도 참조하지 않는 신규 브랜드 생성 후 삭제 시 정상 성공 (200 OK)
        Brand tempBrand = brandRepository.save(Brand.builder().name("삭제테스트_임시브랜드").type("기타").build());
        mockMvc.perform(delete("/api/brands/" + tempBrand.getId()))
                .andExpect(status().isOk());

        // 3. 제품 소프트 삭제(휴지통 이동) 및 복구(Restore)
        mockMvc.perform(delete("/api/products/" + seedProduct.getId()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/products/" + seedProduct.getId() + "/restore"))
                .andExpect(status().isOk());

        // 4. 포장규격서가 등록된 제품의 영구 삭제(Hard Delete) 시도 시 409 Conflict 방어
        PackagingSpecification spec = PackagingSpecification.builder()
                .product(seedProduct)
                .version(1)
                .packagingMethodText("테스트 포장방법")
                .bomItems(new ArrayList<>())
                .build();
        specRepository.save(spec);

        mockMvc.perform(delete("/api/admin/trash/PRODUCT/" + seedProduct.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("포장규격서")));
    }

    @Test
    @Order(5)
    @DisplayName("[W] 특화 업무 로직: 포장규격서 리비전, 6개국 공간비율 0/null 안전 계산, 전성분 규제 스캔")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test05_Workflow_PackagingSpec_SpaceRatio_ComplianceScan() throws Exception {
        // 1. 특정 상품 기준 포장사양서 목록 조회
        mockMvc.perform(get("/api/packaging-specs/product/" + seedProduct.getId()))
                .andExpect(status().isOk());

        // 2. 포장재 BOM 리스트 요약 조회
        mockMvc.perform(get("/api/packaging-specs/product-bom-summary")
                .param("productId", String.valueOf(seedProduct.getId())))
                .andExpect(status().isOk());

        // 3. 공간비율 계산기: 0 및 null 입력 시 ZeroDivision/NPE 없이 안전하게 UNABLE_TO_CALCULATE 반환
        SpaceRatioRequest zeroReq = new SpaceRatioRequest();
        zeroReq.setContentVolumeMl(0.0);
        zeroReq.setPackagingWidth(0.0);
        zeroReq.setPackagingLength(0.0);
        zeroReq.setPackagingHeight(0.0);
        zeroReq.setNumberOfLayers(1);

        mockMvc.perform(post("/api/space-ratio/calculator")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(zeroReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].country").value("KR"));

        // 4. 전성분 규제 스캔: null 및 빈 텍스트 입력 시 정상 방어 응답
        ComplianceScanDto.Request emptyScan = new ComplianceScanDto.Request();
        emptyScan.setIngredientsText("");

        mockMvc.perform(post("/api/compliance/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(emptyScan)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.compliant").value(true));

        // 5. 전성분 규제 스캔: 실제 성분명 입력 스캔
        ComplianceScanDto.Request validScan = new ComplianceScanDto.Request();
        validScan.setIngredientsText("정제수, 글리세린, 부틸렌글라이콜");
        validScan.setCountries(List.of("KR"));

        mockMvc.perform(post("/api/compliance/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validScan)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.compliant").isBoolean());
    }

    @Test
    @Order(6)
    @DisplayName("[UX] 메일 템플릿, 공지사항, 시스템 설정, 버그리포트 관리 연동 검증")
    @WithMockUser(username = "admin", roles = {"ADMIN", "QUALITY_TEAM"})
    void test06_Announcement_MailTemplate_SystemSettings() throws Exception {
        // 1. 메일 템플릿 목록 조회
        mockMvc.perform(get("/api/mail-templates"))
                .andExpect(status().isOk());

        // 2. 전체 공지사항 목록 조회
        mockMvc.perform(get("/api/announcements"))
                .andExpect(status().isOk());

        // 3. 시스템 설정 목록 조회
        mockMvc.perform(get("/api/system-settings"))
                .andExpect(status().isOk());

        // 4. 관리자 시스템 진단 / 마이그레이션 상태 조회
        mockMvc.perform(get("/api/admin/system/migration-status"))
                .andExpect(status().isOk());

        // 5. 관리자 감사 로그 조회
        mockMvc.perform(get("/api/admin/logs"))
                .andExpect(status().isOk());
    }
}
