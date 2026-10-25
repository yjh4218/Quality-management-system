package com.example.ims.controller;

import com.example.ims.entity.MedicalDeviceProduct;
import com.example.ims.service.MedicalDeviceProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 의료기기 품목 마스터 REST 컨트롤러.
 * ISO 13485 및 의료기기법 규제 요건에 맞춘 품목 등록, 조회, 수정, 소프트 삭제 및 요약 통계를 제공합니다.
 */
@RestController
@RequestMapping("/api/medical-devices")
@RequiredArgsConstructor
@Slf4j
public class MedicalDeviceProductController {

    private final MedicalDeviceProductService service;

    /**
     * 의료기기 품목 목록 페이징 및 검색.
     */
    @GetMapping
    public ResponseEntity<Page<MedicalDeviceProduct>> getDevices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String deviceClass,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.getDevicesPaginated(keyword, deviceClass, page, size));
    }

    /**
     * 의료기기 품목 단건 조회.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MedicalDeviceProduct> getDeviceById(@PathVariable Long id) {
        return service.getDeviceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 품목코드 중복 검사.
     */
    @GetMapping("/check-duplicate/{itemCode}")
    public ResponseEntity<Boolean> checkDuplicate(@PathVariable String itemCode) {
        return ResponseEntity.ok(service.checkItemCodeDuplicate(itemCode));
    }

    /**
     * 품목 요약 통계 (등급별 건수, UDI 등록률 등).
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        return ResponseEntity.ok(service.getSummaryMetrics());
    }

    /**
     * 의료기기 품목 신규 등록.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MENU_PRODUCTS_EDIT')")
    public ResponseEntity<MedicalDeviceProduct> createDevice(
            @Valid @RequestBody MedicalDeviceProduct device,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "anonymous";
        return ResponseEntity.ok(service.createDevice(device, username));
    }

    /**
     * 의료기기 품목 정보 수정.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MENU_PRODUCTS_EDIT')")
    public ResponseEntity<MedicalDeviceProduct> updateDevice(
            @PathVariable Long id,
            @Valid @RequestBody MedicalDeviceProduct device,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "anonymous";
        return ResponseEntity.ok(service.updateDevice(id, device, username));
    }

    /**
     * 의료기기 품목 소프트 삭제.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MENU_PRODUCTS_DELETE')")
    public ResponseEntity<Void> deleteDevice(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : "anonymous";
        service.deleteDevice(id, username);
        return ResponseEntity.ok().build();
    }
}
