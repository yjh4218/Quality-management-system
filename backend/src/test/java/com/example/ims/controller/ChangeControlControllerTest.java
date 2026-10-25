package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.ChangeControlService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ChangeControlControllerTest {

    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @Mock
    private ChangeControlService service;

    @InjectMocks
    private ChangeControlController controller;

    private ChangeRequestResponse sampleResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleResponse = ChangeRequestResponse.builder()
                .id(1L)
                .changeNumber("CR-202610-001")
                .title("배터리 사양 변경")
                .category(ChangeCategory.PRODUCT)
                .categoryDescription("제품/사양/원자재")
                .urgency(ChangeUrgency.STANDARD)
                .urgencyDescription("일반")
                .status(ChangeStatus.DRAFT)
                .statusDescription("작성 중")
                .initiatorName("홍길동")
                .department("R&D팀")
                .requestDate(LocalDate.now())
                .changeReason("원자재 단종")
                .currentState("350mAh")
                .proposedChange("400mAh")
                .build();
    }

    @Test
    @DisplayName("GET /api/quality/change-controls/requests - 페이징 목록 조회 성공")
    void getChangeRequests_Success() throws Exception {
        PageImpl<ChangeRequestResponse> page = new PageImpl<>(List.of(sampleResponse), PageRequest.of(0, 10), 1);
        when(service.getChangeRequests(any(), any(), any(), any(), anyInt(), anyInt())).thenReturn(page);

        mockMvc.perform(get("/api/quality/change-controls/requests")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].changeNumber").value("CR-202610-001"))
                .andExpect(jsonPath("$.content[0].title").value("배터리 사양 변경"));
    }

    @Test
    @DisplayName("GET /api/quality/change-controls/requests/{id} - 상세 단건 조회 성공")
    void getChangeRequestById_Success() throws Exception {
        when(service.getChangeRequestById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/quality/change-controls/requests/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.changeNumber").value("CR-202610-001"));
    }

    @Test
    @DisplayName("POST /api/quality/change-controls/requests - 신규 등록 성공 (201 Created)")
    void createChangeRequest_Success() throws Exception {
        ChangeRequestRequest req = ChangeRequestRequest.builder()
                .title("원료 변경")
                .category(ChangeCategory.PRODUCT)
                .initiatorName("홍길동")
                .department("품질팀")
                .requestDate(LocalDate.now())
                .changeReason("품질 개선")
                .currentState("기존")
                .proposedChange("변경")
                .build();

        when(service.createChangeRequest(any(ChangeRequestRequest.class), anyString())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/quality/change-controls/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.changeNumber").value("CR-202610-001"));
    }

    @Test
    @DisplayName("PUT /api/quality/change-controls/requests/{id} - 수정 성공 (200 OK)")
    void updateChangeRequest_Success() throws Exception {
        ChangeRequestRequest req = ChangeRequestRequest.builder()
                .title("수정된 제목")
                .category(ChangeCategory.PRODUCT)
                .initiatorName("홍길동")
                .department("품질팀")
                .requestDate(LocalDate.now())
                .changeReason("사유 수정")
                .currentState("기존")
                .proposedChange("변경")
                .build();

        when(service.updateChangeRequest(eq(1L), any(ChangeRequestRequest.class), anyString())).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/quality/change-controls/requests/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("DELETE /api/quality/change-controls/requests/{id} - 삭제 성공 (204 No Content)")
    void deleteChangeRequest_Success() throws Exception {
        doNothing().when(service).deleteChangeRequest(eq(1L), anyString());

        mockMvc.perform(delete("/api/quality/change-controls/requests/1"))
                .andExpect(status().isNoContent());

        verify(service, times(1)).deleteChangeRequest(eq(1L), anyString());
    }

    @Test
    @DisplayName("POST /api/quality/change-controls/requests/{id}/ccb-review - CCB 심의 완료")
    void reviewCcb_Success() throws Exception {
        CcbReviewRequest ccbReq = CcbReviewRequest.builder()
                .ccbReviewDate(LocalDate.now())
                .ccbAttendees("홍길동, 김품질")
                .ccbSummary("심의 완료")
                .ccbDecision(CcbDecision.APPROVED)
                .build();

        when(service.reviewCcb(eq(1L), any(CcbReviewRequest.class), anyString())).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/quality/change-controls/requests/1/ccb-review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ccbReq)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/quality/change-controls/kpi - KPI 통계 조회 성공")
    void getChangeControlKpis_Success() throws Exception {
        ChangeControlKpiResponse kpi = ChangeControlKpiResponse.builder()
                .totalChanges(10)
                .activeChanges(4)
                .ccbPendingCount(2)
                .effectivenessPassRate(90.0)
                .build();

        when(service.getChangeControlKpis()).thenReturn(kpi);

        mockMvc.perform(get("/api/quality/change-controls/kpi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalChanges").value(10))
                .andExpect(jsonPath("$.effectivenessPassRate").value(90.0));
    }
}
