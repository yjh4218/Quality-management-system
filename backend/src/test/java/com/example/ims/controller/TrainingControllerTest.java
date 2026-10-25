package com.example.ims.controller;

import com.example.ims.dto.TrainingCourseRequest;
import com.example.ims.dto.TrainingMetricsResponse;
import com.example.ims.dto.TrainingRecordRequest;
import com.example.ims.dto.UserQualificationRequest;
import com.example.ims.entity.*;
import com.example.ims.service.TrainingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TrainingControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TrainingService service;

    @InjectMocks
    private TrainingController controller;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeEach
    void setUp() {
        HandlerMethodArgumentResolver authResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return Authentication.class.isAssignableFrom(parameter.getParameterType());
            }

            @Override
            public Object resolveArgument(MethodParameter parameter,
                                          ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest,
                                          WebDataBinderFactory binderFactory) {
                Authentication auth = org.mockito.Mockito.mock(Authentication.class);
                when(auth.getName()).thenReturn("admin");
                return auth;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(authResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/training/courses - 교육과정 목록 조회")
    void getCourses_returnsList() throws Exception {
        TrainingCourse course = TrainingCourse.builder()
                .id(1L)
                .courseCode("TC-GMP-001")
                .courseName("의료기기 GMP 기본")
                .category(TrainingCategory.GMP)
                .build();

        when(service.getCourses(any(), any(), any(), any())).thenReturn(List.of(course));

        mockMvc.perform(get("/api/training/courses")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseCode").value("TC-GMP-001"))
                .andExpect(jsonPath("$[0].courseName").value("의료기기 GMP 기본"));
    }

    @Test
    @DisplayName("POST /api/training/courses - 교육과정 생성")
    void createCourse_returnsCreated() throws Exception {
        TrainingCourseRequest req = TrainingCourseRequest.builder()
                .courseCode("TC-GMP-002")
                .courseName("멸균공정 밸리데이션 교육")
                .category(TrainingCategory.GMP)
                .targetFamily(ProductFamily.MEDICAL_DEVICE)
                .cycleMonths(12)
                .passingScore(80)
                .trainingHours(4.0)
                .isRequired(true)
                .build();

        TrainingCourse created = TrainingCourse.builder()
                .id(2L)
                .courseCode("TC-GMP-002")
                .courseName("멸균공정 밸리데이션 교육")
                .category(TrainingCategory.GMP)
                .build();

        when(service.createCourse(any(TrainingCourseRequest.class), anyString())).thenReturn(created);

        mockMvc.perform(post("/api/training/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseCode").value("TC-GMP-002"));

        verify(service).createCourse(any(TrainingCourseRequest.class), anyString());
    }

    @Test
    @DisplayName("GET /api/training/records - 교육이수 기록 목록 조회")
    void getRecords_returnsList() throws Exception {
        TrainingRecord record = TrainingRecord.builder()
                .id(10L)
                .recordNo("TRR-202610-001")
                .traineeName("홍길동")
                .courseName("의료기기 GMP 기본")
                .completionStatus(TrainingCompletionStatus.COMPLETED)
                .build();

        when(service.getRecords(any(), any(), any(), any(), any(), any())).thenReturn(List.of(record));

        mockMvc.perform(get("/api/training/records")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].recordNo").value("TRR-202610-001"))
                .andExpect(jsonPath("$[0].traineeName").value("홍길동"));
    }

    @Test
    @DisplayName("POST /api/training/records - 교육이수 기록 생성")
    void createRecord_returnsCreated() throws Exception {
        TrainingRecordRequest req = TrainingRecordRequest.builder()
                .courseId(1L)
                .username("hong")
                .traineeName("홍길동")
                .trainingDate(LocalDate.of(2026, 10, 15))
                .score(90)
                .build();

        TrainingRecord created = TrainingRecord.builder()
                .id(10L)
                .recordNo("TRR-202610-001")
                .courseId(1L)
                .traineeName("홍길동")
                .build();

        when(service.createRecord(any(TrainingRecordRequest.class), anyString())).thenReturn(created);

        mockMvc.perform(post("/api/training/records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recordNo").value("TRR-202610-001"));
    }

    @Test
    @DisplayName("GET /api/training/qualifications - 직무 자격 목록 조회")
    void getQualifications_returnsList() throws Exception {
        UserQualification q = UserQualification.builder()
                .id(20L)
                .employeeName("홍길동")
                .qualificationName("ISO 13485 내부심사원")
                .qualificationStatus(QualificationStatus.QUALIFIED)
                .build();

        when(service.getQualifications(any(), any(), any(), any())).thenReturn(List.of(q));

        mockMvc.perform(get("/api/training/qualifications")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].employeeName").value("홍길동"))
                .andExpect(jsonPath("$[0].qualificationName").value("ISO 13485 내부심사원"));
    }

    @Test
    @DisplayName("POST /api/training/qualifications - 직무 자격 등록")
    void createQualification_returnsCreated() throws Exception {
        UserQualificationRequest req = UserQualificationRequest.builder()
                .userId(1L)
                .username("hong")
                .employeeName("홍길동")
                .qualificationName("ISO 13485 내부심사원")
                .qualificationType(QualificationType.AUDITOR)
                .certifiedDate(LocalDate.of(2026, 1, 15))
                .expiryDate(LocalDate.of(2027, 1, 15))
                .build();

        UserQualification created = UserQualification.builder()
                .id(20L)
                .employeeName("홍길동")
                .qualificationName("ISO 13485 내부심사원")
                .build();

        when(service.createQualification(any(UserQualificationRequest.class), anyString())).thenReturn(created);

        mockMvc.perform(post("/api/training/qualifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeName").value("홍길동"));
    }

    @Test
    @DisplayName("GET /api/training/metrics - 대시보드 KPI 조회")
    void getMetrics_returnsMetrics() throws Exception {
        TrainingMetricsResponse metrics = TrainingMetricsResponse.builder()
                .totalCourses(5)
                .activeCourses(5)
                .totalRecords(10)
                .completedRecords(8)
                .completionRate(80.0)
                .scheduledRecords(2)
                .expiringSoonRecords(1)
                .expiredRecords(0)
                .totalQualifications(6)
                .qualifiedUsers(5)
                .expiringSoonQualifications(2)
                .build();

        when(service.getMetrics()).thenReturn(metrics);

        mockMvc.perform(get("/api/training/metrics")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCourses").value(5))
                .andExpect(jsonPath("$.completionRate").value(80.0))
                .andExpect(jsonPath("$.qualifiedUsers").value(5));
    }
}
