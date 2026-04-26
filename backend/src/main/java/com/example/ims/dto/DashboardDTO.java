package com.example.ims.dto;

import com.example.ims.entity.AuditLog;
import com.example.ims.entity.Claim;
import com.example.ims.entity.Product;
import com.example.ims.entity.User;
import com.example.ims.entity.WmsInbound;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardDTO {
    private List<DashboardItemDTO> newProducts; // 신규 등록 품목
    private List<DashboardItemDTO> pendingUsers; // 사용자 승인 요청
    private List<DashboardItemDTO> auditLogs; // 시스템 변경 이력
    private List<DashboardItemDTO> qualityInbounds; // 입고 품질 관리 리스트
    private List<DashboardItemDTO> pendingDimensions; // 체적 확정 필요 리스트 (가안)
    private List<DashboardItemDTO> confirmedDimensions; // 체적 확정 리스트 (확정)
    private List<DashboardItemDTO> recentClaims; // 최근 클레임 내역
    private List<DashboardItemDTO> completedMfrClaims; // 제조사 답변 완료 내역
    private List<DashboardItemDTO> needsAuditReview; // 생산감리 검토 필요
    private List<DashboardItemDTO> needsAuditProgress; // 생산감리 진행 필요
    private List<String> widgetConfig; // 대시보드 위젯 구성 (JSON Array)
}
