package com.example.ims;

import com.example.ims.config.RoleConstants;
import com.example.ims.entity.MedicalDeviceProduct;
import com.example.ims.repository.MedicalDeviceProductRepository;
import com.example.ims.repository.RoleRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "com.example.ims.util.SystemStartupRunner.enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles("ci")
@Transactional
class RoleDeviceAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private MedicalDeviceProductRepository medicalDeviceProductRepository;

    @Autowired
    private com.example.ims.service.SystemInitializationService systemInitializationService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        systemInitializationService.seedAndRepairRoles();
    }

    @Test
    @DisplayName("[TASK-VAL-02] RoleConstants에 ROLE_DEVICE 상수가 정상 등록되어 있는지 검증")
    void verifyRoleConstantsHasDevice() {
        assertThat(RoleConstants.DEVICE).isEqualTo("ROLE_DEVICE");
        assertThat(RoleConstants.DEVICE_NAME).isEqualTo("DEVICE");
        assertThat(RoleConstants.isValidRole("ROLE_DEVICE")).isTrue();
    }

    @Test
    @DisplayName("[TASK-VAL-02] ROLE_DEVICE 역할이 roles 테이블에 정상 시딩되었는지 검증")
    void verifyRoleDeviceSeededInDatabase() {
        var roleOpt = roleRepository.findByRoleKey("ROLE_DEVICE");
        assertThat(roleOpt).isPresent();
        var role = roleOpt.get();
        assertThat(role.getDisplayName()).isEqualTo("디바이스 담당자");
        assertThat(role.getAllowedMenus()).contains("medicalDevices");
        assertThat(role.getAllowedMenus()).contains("designControls");
        assertThat(role.getAllowedMenus()).contains("riskManagement");
        assertThat(role.getAllowedMenus()).contains("vigilanceRecallManagement");
    }

    @Test
    @DisplayName("[TASK-VAL-02] 디바이스(ROLE_DEVICE) 계정으로 의료기기 품목 조회 API 호출 시 200 OK")
    @WithMockUser(username = "device_user", roles = {"DEVICE"})
    void getMedicalDevices_asDevice_success() throws Exception {
        mockMvc.perform(get("/api/medical-devices"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("[TASK-VAL-02] 디바이스(ROLE_DEVICE) 계정으로 의료기기 품목 등록 API 호출 시 200 OK")
    @WithMockUser(username = "device_user", roles = {"DEVICE"})
    void createMedicalDevice_asDevice_success() throws Exception {
        MedicalDeviceProduct device = MedicalDeviceProduct.builder()
                .itemCode("TEST-DEV-VAL-01")
                .productName("디바이스 검증용 레이저 조사기")
                .deviceClassification("2등급")
                .udiDi("8809123456789")
                .intendedUse("피부 치료용 의료기기")
                .build();

        mockMvc.perform(post("/api/medical-devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(device)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("TEST-DEV-VAL-01"))
                .andExpect(jsonPath("$.productName").value("디바이스 검증용 레이저 조사기"));
    }

    @Test
    @DisplayName("[TASK-VAL-02] 디바이스(ROLE_DEVICE) 계정으로 관리자 전용 API(시스템 설정) 접근 시 403 Forbidden 차단")
    @WithMockUser(username = "device_user", roles = {"DEVICE"})
    void adminOnlyEndpoint_asDevice_forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/system/settings"))
                .andExpect(status().isForbidden());
    }
}
