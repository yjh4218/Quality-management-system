package com.example.ims.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;
import com.example.ims.entity.Claim;

@Data
@Builder
public class ClaimDashboardDto {
    private Map<String, List<Map<String, Object>>> topProductsByBrand;
    private List<Map<String, Object>> topCategories;

    private List<Map<String, Object>> repeatedClaimsAlert; // 품목별/유형별 반복 발생 우려

    private long thisMonthCount;    // 이번달
    private long lastMonthCount;    // 전월
    private long lastQuarterCount;  // 전분기
    private long oneYearCount;      // 최근 1년
    
    private List<Claim> unclosedClaims; // 미종결 클레임 리스트
    private List<Claim> allClaims;      // 차트/통계용 전체 필터링된 리스트
}
