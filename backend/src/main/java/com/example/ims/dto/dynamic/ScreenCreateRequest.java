package com.example.ims.dto.dynamic;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenCreateRequest {

    @NotBlank(message = "화면 코드는 필수입니다.")
    @Size(max = 50, message = "화면 코드는 최대 50자까지 가능합니다.")
    @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "화면 코드는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.")
    private String screenCode;

    @NotBlank(message = "화면명은 필수입니다.")
    @Size(max = 100, message = "화면명은 최대 100자까지 가능합니다.")
    private String screenName;

    @Builder.Default
    private String screenType = "GRID";

    @Size(max = 200, message = "API 엔드포인트는 최대 200자까지 가능합니다.")
    private String apiEndpoint;

    @Size(max = 100, message = "대상 테이블명은 최대 100자까지 가능합니다.")
    private String targetTable;

    private String description;

    @Builder.Default
    private Boolean enableRowSelection = false;

    @Builder.Default
    private String rowSelectionMode = "MULTI";

    // 메뉴 배치 정보
    private Long parentMenuId;
    private String menuIcon;
    private Integer menuOrder;

    // 컬럼 목록 (최소 1개 이상 권장)
    @Valid
    @NotEmpty(message = "그리드 컬럼을 최소 1개 이상 추가해야 합니다.")
    private List<GridColumnCreateDto> columns;

    // 검색 필드 카탈로그 ID 목록
    private List<Long> searchFieldCatalogIds;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GridColumnCreateDto {

        @NotBlank(message = "컬럼 필드키(fieldKey)는 필수입니다.")
        @Size(max = 50, message = "필드키는 최대 50자까지 가능합니다.")
        private String fieldKey;

        @NotBlank(message = "컬럼 표시명(label)은 필수입니다.")
        @Size(max = 50, message = "표시명은 최대 50자까지 가능합니다.")
        private String label;

        @NotBlank(message = "필드 타입은 필수입니다.")
        @Builder.Default
        private String fieldType = "TEXT";

        private Long relationSourceId;

        @Builder.Default
        private Integer width = 150;

        @Builder.Default
        private Boolean sortable = true;

        @Builder.Default
        private Boolean editable = false;

        @Builder.Default
        private Integer displayOrder = 0;

        @Builder.Default
        private Boolean isMeasure = false;

        @Builder.Default
        private Boolean isDimension = false;

        private String aggregationType;

        @Builder.Default
        private Boolean isPrimaryDate = false;

        @Builder.Default
        private Boolean isExcludedFromDashboard = false;
    }
}
