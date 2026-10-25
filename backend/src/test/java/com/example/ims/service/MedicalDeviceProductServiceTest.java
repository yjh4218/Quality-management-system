package com.example.ims.service;

import com.example.ims.entity.MedicalDeviceProduct;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.MedicalDeviceProductRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MedicalDeviceProductServiceTest {

    @Mock
    private MedicalDeviceProductRepository repository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private MedicalDeviceProductService service;

    private MedicalDeviceProduct sampleDevice;

    @BeforeEach
    void setUp() {
        sampleDevice = MedicalDeviceProduct.builder()
                .id(1L)
                .itemCode("MD-2026-001")
                .productName("휴대용 초음파 진단기")
                .englishProductName("Portable Ultrasound Diagnostic Device")
                .modelName("PUD-100X")
                .deviceClassification("CLASS_II")
                .intendedUse("체내 연조직 초음파 영상 진단")
                .licenseNumber("제허 26-104호")
                .udiDi("88012345678901")
                .udiPiType("LOT,EXPIRY,SERIAL")
                .isSoftware(true)
                .softwareVersion("v1.2.0")
                .isSterile(false)
                .storageConditions("실온(1~30℃)")
                .shelfLifeMonths(36)
                .manufacturer("(주)메디텍인스트루먼트")
                .remarks("초도 생산품목")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("의료기기 품목 신규 등록 및 중복 코드 검증")
    void testCreateDeviceSuccessAndDuplicateValidation() {
        // Given
        when(repository.existsByItemCode("MD-2026-001")).thenReturn(false);
        when(repository.save(any(MedicalDeviceProduct.class))).thenAnswer(invocation -> {
            MedicalDeviceProduct entity = invocation.getArgument(0);
            entity.setId(10L);
            return entity;
        });

        // When
        MedicalDeviceProduct created = service.createDevice(sampleDevice, "admin");

        // Then
        assertThat(created.getId()).isEqualTo(10L);
        assertThat(created.getItemCode()).isEqualTo("MD-2026-001");
        assertThat(created.isActive()).isTrue();
        assertThat(created.isDeleted()).isFalse();

        verify(eventPublisher, times(1)).publishEvent(any(EntityChangeEvent.class));

        // When duplicate exists
        when(repository.existsByItemCode("MD-DUP")).thenReturn(true);
        MedicalDeviceProduct dup = MedicalDeviceProduct.builder().itemCode("MD-DUP").build();
        assertThatThrownBy(() -> service.createDevice(dup, "admin"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이미 등록된 품목코드입니다");
    }

    @Test
    @DisplayName("의료기기 품목 수정 및 필드 업데이트 검증")
    void testUpdateDevice() {
        // Given
        when(repository.findById(1L)).thenReturn(Optional.of(sampleDevice));
        when(repository.save(any(MedicalDeviceProduct.class))).thenAnswer(inv -> inv.getArgument(0));

        MedicalDeviceProduct updatedInfo = MedicalDeviceProduct.builder()
                .itemCode("MD-2026-001")
                .productName("휴대용 초음파 진단기 Plus")
                .deviceClassification("CLASS_III")
                .isSoftware(true)
                .softwareVersion("v2.0.0")
                .isSterile(true)
                .sterilizationMethod("GAMMA")
                .active(true)
                .build();

        // When
        MedicalDeviceProduct result = service.updateDevice(1L, updatedInfo, "admin");

        // Then
        assertThat(result.getProductName()).isEqualTo("휴대용 초음파 진단기 Plus");
        assertThat(result.getDeviceClassification()).isEqualTo("CLASS_III");
        assertThat(result.getSoftwareVersion()).isEqualTo("v2.0.0");
        assertThat(result.isSterile()).isTrue();
        assertThat(result.getSterilizationMethod()).isEqualTo("GAMMA");
        verify(repository, times(1)).save(sampleDevice);
        verify(eventPublisher, times(1)).publishEvent(any(EntityChangeEvent.class));
    }

    @Test
    @DisplayName("의료기기 품목 소프트 삭제(Soft Delete) 동작 검증")
    void testSoftDelete() {
        // Given
        when(repository.findById(1L)).thenReturn(Optional.of(sampleDevice));

        // When
        service.deleteDevice(1L, "admin");

        // Then
        assertThat(sampleDevice.isDeleted()).isTrue();
        assertThat(sampleDevice.isActive()).isFalse();
        assertThat(sampleDevice.getDeletedAt()).isNotNull();

        verify(repository, times(1)).save(sampleDevice);
        verify(eventPublisher, times(1)).publishEvent(any(EntityChangeEvent.class));
    }

    @Test
    @DisplayName("의료기기 요약 지표 (Metrics) 집계 검증")
    void testGetSummaryMetrics() {
        // Given
        when(repository.count()).thenReturn(10L);
        List<Object[]> classGroups = new ArrayList<>();
        classGroups.add(new Object[]{"CLASS_I", 4L});
        classGroups.add(new Object[]{"CLASS_II", 5L});
        classGroups.add(new Object[]{"CLASS_III", 1L});
        when(repository.countByClassificationGroup()).thenReturn(classGroups);
        when(repository.countByUdiDiIsNotNullAndUdiDiNot("")).thenReturn(8L);

        // When
        Map<String, Object> metrics = service.getSummaryMetrics();

        // Then
        assertThat(metrics.get("totalCount")).isEqualTo(10L);
        assertThat(metrics.get("udiRegisteredCount")).isEqualTo(8L);
        assertThat(metrics.get("udiRate")).isEqualTo(80L);

        @SuppressWarnings("unchecked")
        Map<String, Long> classMap = (Map<String, Long>) metrics.get("classificationCounts");
        assertThat(classMap).containsEntry("CLASS_I", 4L);
        assertThat(classMap).containsEntry("CLASS_II", 5L);
        assertThat(classMap).containsEntry("CLASS_III", 1L);
    }

    @Test
    @DisplayName("페이징 목록 검색 검증")
    void testGetDevicesPaginated() {
        // Given
        List<MedicalDeviceProduct> list = List.of(sampleDevice);
        Page<MedicalDeviceProduct> page = new PageImpl<>(list, PageRequest.of(0, 10), 1);
        when(repository.searchDevices(eq("초음파"), eq("CLASS_II"), any(Pageable.class))).thenReturn(page);

        // When
        Page<MedicalDeviceProduct> result = service.getDevicesPaginated("초음파", "CLASS_II", 0, 10);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getItemCode()).isEqualTo("MD-2026-001");
    }
}
