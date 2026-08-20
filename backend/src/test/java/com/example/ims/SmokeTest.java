package com.example.ims;

import com.example.ims.controller.PackagingSpecificationController;
import com.example.ims.controller.ProductController;
import com.example.ims.entity.Product;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
public class SmokeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired(required = false)
    private ProductController productController;

    @Autowired(required = false)
    private PackagingSpecificationController packagingSpecController;

    @Test
    @DisplayName("1. 백엔드 주요 컨트롤러 및 컴포넌트 마운트 정상 검증")
    void contextLoadsAndControllersMounted() {
        assertThat(productController).isNotNull();
        assertThat(packagingSpecController).isNotNull();
    }

    @Test
    @DisplayName("2. 미인증 사용자의 보호된 API 접근 시 401/403 거부 검증")
    void unauthenticatedAccessShouldBeRejected() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/packaging-specs"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("3. 마스터 제품 설정 및 비즈니스 객체 생성 검증")
    void productMasterEntityTest() {
        Product master = new Product();
        master.setProductName("테스트 마스터 제품");
        master.setItemCode("MST-001");
        master.setMaster(true);

        assertThat(master).isNotNull();
        assertThat(master.isMaster()).isTrue();
        assertThat(master.getItemCode()).isEqualTo("MST-001");
    }
}
