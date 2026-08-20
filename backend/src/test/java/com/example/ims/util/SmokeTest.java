package com.example.ims.util;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductType;
import com.example.ims.entity.PaletteType;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.service.PackagingSpecService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "com.example.ims.util.SystemStartupRunner.enabled=false")
@AutoConfigureMockMvc
@Transactional
public class SmokeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PackagingSpecService specService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PackagingSpecificationRepository specRepository;

    /**
     * 1. copyFromMaster() 채널종속필드 재계산 검증
     */
    @Test
    public void testCopyFromMasterRecalculatesChannelFields() {
        // Master Product 생성
        Product masterProduct = Product.builder()
                .itemCode("MST-001")
                .productName("마스터 상품")
                .productType(ProductType.PET_REGULAR)
                .active(true)
                .deleted(false)
                .build();
        masterProduct = productRepository.save(masterProduct);

        // Target Product 생성 (채널 등 다름)
        Product targetProduct = Product.builder()
                .itemCode("TGT-001")
                .productName("타겟 상품")
                .productType(ProductType.PET_REGULAR)
                .active(true)
                .deleted(false)
                .channels(new ArrayList<>()) // 빈 채널로 설정하여 디폴트값 유도
                .build();
        targetProduct = productRepository.save(targetProduct);

        // Master Spec 생성
        PackagingSpecification masterSpec = PackagingSpecification.builder()
                .product(masterProduct)
                .version(1)
                .palletType(PaletteType.WOODEN_FUMIGATED) // 우드 팔레트
                .applyChannelSticker(true) // 스티커 필요로 저장
                .packagingMethodText("마스터 포장법 기술")
                .build();
        specRepository.save(masterSpec);

        // 복사 실행
        PackagingSpecification copiedSpec = specService.copyFromMaster(
                targetProduct.getId(),
                masterProduct.getId(),
                "admin"
        );

        // 검증: 포장법 텍스트 등은 복사됨
        assertEquals("마스터 포장법 기술", copiedSpec.getPackagingMethodText());
        
        // 검증: 채널 종속 필드들은 타겟 상품 기준으로 신규 재계산됨
        assertFalse(copiedSpec.isApplyChannelSticker(), "타겟 상품에 채널이 없으므로 스티커 여부는 false로 재계산되어야 함");
        assertNotEquals(PaletteType.WOODEN_FUMIGATED, copiedSpec.getPalletType(), "팔레트 종류는 타겟 기준으로 재계산되어야 함");
    }

    /**
     * 2. 미인증요청 401/403 거부 검증
     */
    @Test
    public void testUnauthorizedRequestsAreBlocked() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/products"))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/quality/inbound"))
                .andExpect(status().is4xxClientError());
    }

    @Autowired
    private com.example.ims.repository.UserRepository userRepository;

    @Autowired
    private com.example.ims.repository.RoleRepository roleRepository;

    /**
     * 3. 대시보드 5종 마운트 검증
     */
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    public void testDashboardDataLoadsSuccessfully() throws Exception {
        roleRepository.findByRoleKey("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(com.example.ims.entity.Role.builder()
                        .roleKey("ROLE_ADMIN")
                        .displayName("관리자")
                        .allowedMenus("ALL")
                        .allowedPermissions("ALL")
                        .build()));

        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.saveAndFlush(com.example.ims.entity.User.builder()
                    .username("admin")
                    .password("password")
                    .role("ROLE_ADMIN")
                    .enabled(true)
                    .build());
        }

        mockMvc.perform(get("/api/dashboard")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentClaims").exists())
                .andExpect(jsonPath("$.newProducts").exists())
                .andExpect(jsonPath("$.pendingUsers").exists())
                .andExpect(jsonPath("$.auditLogs").exists())
                .andExpect(jsonPath("$.qualityInbounds").exists());
    }
}
