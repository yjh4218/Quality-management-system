package com.example.ims.service;

import com.example.ims.dto.DashboardDTO;
import com.example.ims.dto.DashboardItemDTO;
import com.example.ims.entity.AuditLog;
import com.example.ims.entity.Claim;
import com.example.ims.entity.Product;
import com.example.ims.entity.User;
import com.example.ims.entity.WmsInbound;
import com.example.ims.repository.AuditLogRepository;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.repository.UserRepository;
import com.example.ims.repository.WmsInboundRepository;
import com.example.ims.repository.ProductionAuditRepository;
import com.example.ims.repository.DashboardLayoutRepository;
import com.example.ims.repository.RoleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.example.ims.entity.ProductionAudit;

/**
 * 시스템 대시보드 데이터 처리를 담당하는 핵심 서비스 클래스입니다.
 * 역할 기반(RBAC)으로 대시보드 위젯 데이터를 수집하고, 동적인 레이아웃 설정을 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final WmsInboundRepository wmsInboundRepository;
    private final ClaimRepository claimRepository;
    private final RoleService roleService;
    private final ProductionAuditRepository productionAuditRepository;
    private final DashboardLayoutRepository dashboardLayoutRepository;
    private final RoleRepository roleRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 현재 로그인한 사용자의 정보를 바탕으로 대시보드 데이터를 조회합니다.
     * 
     * @param user 현재 세션의 사용자 엔티티
     * @return 위젯 데이터 및 레이아웃 설정이 포함된 DashboardDTO
     */
    public DashboardDTO getDashboardData(User user) {
        String role = user.getRole();
        String company = user.getCompanyName();
        String dept = user.getDepartment();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneMonthAgo = now.minusMonths(1);
        LocalDateTime twoWeeksAgo = now.minusWeeks(2);

        DashboardDTO.DashboardDTOBuilder builder = DashboardDTO.builder();

        // 1. Common Logic: Recent Claims (Limited to 50)
        if ("ROLE_MANUFACTURER".equals(role)) {
            builder.recentClaims(claimRepository
                    .findTop50ByManufacturerAndReceiptDateAfterOrderByReceiptDateDesc(company,
                            oneMonthAgo.toLocalDate())
                    .stream().map(this::mapClaimToItem).collect(Collectors.toList()));
        } else {
            builder.recentClaims(
                    claimRepository.findTop50ByReceiptDateAfterOrderByReceiptDateDesc(oneMonthAgo.toLocalDate())
                            .stream().map(this::mapClaimToItem).collect(Collectors.toList()));
        }

        // 2. Role-specific Logic
        if ("ROLE_ADMIN".equals(role)) {
            builder.newProducts(productRepository.findTop50ByCreatedAtAfterOrderByCreatedAtDesc(oneMonthAgo)
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));

            builder.pendingUsers(userRepository.findByEnabledFalse()
                    .stream().map(this::mapUserToItem).collect(Collectors.toList()));

            builder.auditLogs(auditLogRepository.findTop50ByModifiedAtAfterOrderByModifiedAtDesc(oneMonthAgo)
                    .stream().map(this::mapAuditLogToItem).collect(Collectors.toList()));

            builder.qualityInbounds(wmsInboundRepository.findTop50ByInboundDateAfterOrderByInboundDateDesc(oneMonthAgo)
                    .stream().map(this::mapWmsInboundToItem).collect(Collectors.toList()));

            builder.pendingDimensions(productRepository.findTop50ByDimensionsStatus("가안")
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));

            builder.confirmedDimensions(
                    productRepository.findTop50ByCreatedAtAfterAndDimensionsStatus(oneMonthAgo, "확정")
                            .stream().map(this::mapProductToItem).collect(Collectors.toList()));

        } else if (isQualityDept(role)) {
            builder.newProducts(productRepository.findTop50ByCreatedAtAfterOrderByCreatedAtDesc(twoWeeksAgo)
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));

            builder.qualityInbounds(wmsInboundRepository.findTop50ByInboundDateAfterOrderByInboundDateDesc(oneMonthAgo)
                    .stream().map(this::mapWmsInboundToItem).collect(Collectors.toList()));

            builder.pendingDimensions(productRepository.findTop50ByDimensionsStatus("가안")
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));

            builder.confirmedDimensions(
                    productRepository.findTop50ByCreatedAtAfterAndDimensionsStatus(twoWeeksAgo, "확정")
                            .stream().map(this::mapProductToItem).collect(Collectors.toList()));

        } else if (isSalesDept(role)) {
            builder.newProducts(productRepository.findTop50ByCreatedAtAfterOrderByCreatedAtDesc(twoWeeksAgo)
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));

            builder.confirmedDimensions(
                    productRepository.findTop50ByCreatedAtAfterAndDimensionsStatus(oneMonthAgo, "확정")
                            .stream().map(this::mapProductToItem).collect(Collectors.toList()));

        } else if ("ROLE_MANUFACTURER".equals(role)) {
            builder.qualityInbounds(wmsInboundRepository
                    .findTop50ByManufacturerAndInboundDateAfterOrderByInboundDateDesc(company, oneMonthAgo)
                    .stream().map(this::mapWmsInboundToItem).collect(Collectors.toList()));
        }

        // 3. Production Audit Dashboard Logic
        if ("ROLE_ADMIN".equals(role) || isQualityDept(role)) {
            // Managers: Review = SUBMITTED, Progress = PENDING (no audit yet)
            builder.needsAuditReview(
                    productionAuditRepository.findTop50ByStatusAndIsDeletedFalseOrderByUploadDateDesc("SUBMITTED")
                            .stream().map(this::mapAuditToItem).collect(Collectors.toList()));

            builder.needsAuditProgress(productionAuditRepository.findPendingProducts()
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));
        } else if ("ROLE_MANUFACTURER".equals(role)) {
            // Manufacturers: Progress = (Disclosed & PENDING) OR REJECTED
            List<DashboardItemDTO> mfrProgress = new ArrayList<>();

            // 1. Pending products (disclosed)
            mfrProgress.addAll(productionAuditRepository.findPendingProductsByManufacturerAndIsDisclosedTrue(company)
                    .stream().map(this::mapProductToItem).collect(Collectors.toList()));

            // 2. Rejected audits
            mfrProgress.addAll(productionAuditRepository
                    .findTop50ByManufacturerNameAndStatusAndIsDisclosedTrueAndIsDeletedFalseOrderByUploadDateDesc(
                            company, "REJECTED")
                    .stream().map(this::mapAuditToItem).collect(Collectors.toList()));

            builder.needsAuditProgress(mfrProgress);
        }

        // 4. New Logic: Manufacturer Quality Responses Complete (Admin, Quality, Sales)
        if (roleService.hasPermission(role, "DASHBOARD_QUALITY_VIEW")
                || roleService.hasPermission(role, "DASHBOARD_SALES_VIEW")) {
            builder.completedMfrClaims(claimRepository
                    .findTop50ByMfrTerminationDateAfterOrderByMfrTerminationDateDesc(oneMonthAgo.toLocalDate())
                    .stream().map(this::mapClaimToItem).collect(Collectors.toList()));
        }

        // 5. Dashboard Layout Configuration
        builder.widgetConfig(getWidgetConfigForUser(user));

        return builder.build();
    }

    /**
     * 사용자의 역할에 매핑된 위젯 구성 리스트를 가져옵니다.
     * 1. Role 엔티티에 직접 할당된 대시보드 레이아웃(DashboardLayout)을 우선 확인합니다.
     * 2. 할당된 레이아웃이 없거나 로드 실패 시, 역할별 기본 위젯 설정을 반환합니다.
     * 
     * @param user 대상 사용자
     * @return 위젯 키 리스트 (예: ["WIDGET_NEW_PRODUCTS", ...])
     */
    private List<String> getWidgetConfigForUser(User user) {
        String roleKey = user.getRole();
        if (roleKey == null || roleKey.isEmpty()) {
            return getDefaultWidgetsForRole("");
        }

        // 1. Try to find assigned layout in Role entity
        com.example.ims.entity.Role roleEntity = roleRepository.findByRoleKey(roleKey).orElse(null);
        if (roleEntity != null && roleEntity.getDashboardLayoutId() != null) {
            return dashboardLayoutRepository.findById(roleEntity.getDashboardLayoutId())
                    .map(layout -> {
                        try {
                            return objectMapper.readValue(layout.getWidgetConfig(), new TypeReference<List<String>>() {
                            });
                        } catch (Exception e) {
                            return getDefaultWidgetsForRole(roleKey);
                        }
                    })
                    .orElseGet(() -> getDefaultWidgetsForRole(roleKey));
        }

        // 2. Fallback to Role-based defaults
        return getDefaultWidgetsForRole(roleKey);
    }

    /**
     * 대시보드 레이아웃 설정이 없는 경우 사용하는 역할별 기본 하드코딩 설정입니다.
     * 시스템 초기화 단계에서 유연성을 확보하기 위한 Fallback 로직입니다.
     * 
     * @param role 역할 키 (예: ROLE_ADMIN)
     * @return 기본 위젯 키 리스트
     */
    private List<String> getDefaultWidgetsForRole(String role) {
        if ("ROLE_ADMIN".equals(role)) {
            return List.of(
                    "WIDGET_NEW_PRODUCTS", "WIDGET_PENDING_USERS", "WIDGET_AUDIT_LOGS",
                    "WIDGET_QUALITY_INBOUNDS", "WIDGET_PENDING_DIMENSIONS", "WIDGET_CONFIRMED_DIMENSIONS",
                    "WIDGET_RECENT_CLAIMS", "WIDGET_MFR_COMPLETED_CLAIMS", "WIDGET_AUDIT_REVIEW",
                    "WIDGET_AUDIT_PROGRESS");
        } else if ("ROLE_QUALITY".equals(role)) {
            return List.of(
                    "WIDGET_NEW_PRODUCTS", "WIDGET_QUALITY_INBOUNDS", "WIDGET_PENDING_DIMENSIONS",
                    "WIDGET_CONFIRMED_DIMENSIONS", "WIDGET_RECENT_CLAIMS", "WIDGET_MFR_COMPLETED_CLAIMS",
                    "WIDGET_AUDIT_REVIEW", "WIDGET_AUDIT_PROGRESS");
        } else if ("ROLE_MANUFACTURER".equals(role)) {
            return List.of("WIDGET_QUALITY_INBOUNDS", "WIDGET_RECENT_CLAIMS", "WIDGET_AUDIT_PROGRESS");
        } else if ("ROLE_SALES".equals(role)) {
            return List.of("WIDGET_NEW_PRODUCTS", "WIDGET_CONFIRMED_DIMENSIONS", "WIDGET_RECENT_CLAIMS",
                    "WIDGET_MFR_COMPLETED_CLAIMS");
        } else {
            // Default for any other role
            return List.of("WIDGET_NEW_PRODUCTS", "WIDGET_RECENT_CLAIMS");
        }
    }

    private boolean isQualityDept(String role) {
        if (role == null)
            return false;
        return roleService.hasPermission(role, "DASHBOARD_QUALITY_VIEW");
    }

    private boolean isSalesDept(String role) {
        if (role == null)
            return false;
        return roleService.hasPermission(role, "DASHBOARD_SALES_VIEW");
    }

    // Mapping Helpers
    private DashboardItemDTO mapProductToItem(Product p) {
        String mName = "";
        if (p.getManufacturerInfo() != null) {
            mName = p.getManufacturerInfo().getName();
        } else if (p.getManufacturer() != null) {
            mName = p.getManufacturer();
        }

        return DashboardItemDTO.builder()
                .id(p.getId())
                .code(p.getItemCode())
                .name(p.getProductName())
                .status(p.getDimensions() != null ? p.getDimensions().getStatus() : null)
                .date(p.getCreatedAt() != null ? p.getCreatedAt().format(DATE_FORMATTER) : "")
                .extraInfo(createExtraInfo(
                        "isMaster", p.isMaster(),
                        "isPlanningSet", p.isPlanningSet(),
                        "manufacturer", mName))
                .build();
    }

    private DashboardItemDTO mapUserToItem(User u) {
        return DashboardItemDTO.builder()
                .id(u.getId())
                .code(u.getUsername())
                .name(u.getName())
                .category(u.getCompanyName())
                .build();
    }

    private DashboardItemDTO mapAuditLogToItem(AuditLog log) {
        return DashboardItemDTO.builder()
                .id(log.getId())
                .status(log.getAction())
                .name(log.getDescription())
                .date(log.getModifiedAt() != null ? log.getModifiedAt().format(DATE_FORMATTER) : "")
                .category(log.getEntityType())
                .build();
    }

    private DashboardItemDTO mapWmsInboundToItem(WmsInbound w) {
        return DashboardItemDTO.builder()
                .id(w.getId())
                .code(w.getItemCode())
                .name(w.getProductName())
                .status(w.getOverallStatus() != null ? w.getOverallStatus().getLabel() : "")
                .date(w.getInboundDate() != null ? w.getInboundDate().format(DATE_FORMATTER) : "")
                .category(w.getManufacturer())
                .extraInfo(createExtraInfo(
                        "quantity", w.getQuantity() != null ? w.getQuantity() : 0,
                        "lotNumber", w.getLotNumber() != null ? w.getLotNumber() : ""))
                .build();
    }

    private DashboardItemDTO mapClaimToItem(Claim c) {
        return DashboardItemDTO.builder()
                .id(c.getId())
                .code(c.getItemCode())
                .name(c.getProductName())
                .status(c.getQualityStatus())
                .date(c.getReceiptDate() != null ? c.getReceiptDate().format(DATE_FORMATTER) : "")
                .category(c.getManufacturer())
                .extraInfo(createExtraInfo(
                        "lotNumber", c.getLotNumber() != null ? c.getLotNumber() : "",
                        "country", c.getCountry() != null ? c.getCountry() : "국내",
                        "primaryCategory", c.getPrimaryCategory() != null ? c.getPrimaryCategory() : ""))
                .build();
    }

    private DashboardItemDTO mapAuditToItem(com.example.ims.entity.ProductionAudit a) {
        return DashboardItemDTO.builder()
                .id(a.getId())
                .code(a.getItemCode())
                .name(a.getProductName())
                .status(a.getStatus())
                .date(a.getUploadDate() != null ? a.getUploadDate().format(DATE_FORMATTER) : "")
                .category(a.getManufacturerName())
                .extraInfo(createExtraInfo(
                        "productionDate",
                        a.getProductionDate() != null ? a.getProductionDate().format(DATE_FORMATTER) : "",
                        "isAudit", true))
                .build();
    }

    private java.util.Map<String, Object> createExtraInfo(Object... keysValues) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        for (int i = 0; i < keysValues.length; i += 2) {
            if (keysValues[i] != null) {
                map.put(keysValues[i].toString(), keysValues[i + 1]);
            }
        }
        return map;
    }
}
