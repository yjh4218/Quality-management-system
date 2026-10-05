package com.example.ims.dto.dynamic;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
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
public class ScreenUpdateRequest {

    @NotBlank(message = "화면명은 필수입니다.")
    @Size(max = 100, message = "화면명은 최대 100자까지 가능합니다.")
    private String screenName;

    @Builder.Default
    private String screenType = "GRID";

    private String description;

    private String apiEndpoint;

    @Builder.Default
    private Boolean enableRowSelection = false;

    @Builder.Default
    private String rowSelectionMode = "MULTI";

    // 메뉴 배치 정보
    private Long parentMenuId;
    private String menuIcon;
    private Integer menuOrder;

    // 컬럼 목록 (최소 1개 이상)
    @Valid
    @NotEmpty(message = "그리드 컬럼을 최소 1개 이상 추가해야 합니다.")
    private List<ScreenCreateRequest.GridColumnCreateDto> columns;

    // 검색 필드 카탈로그 ID 목록
    private List<Long> searchFieldCatalogIds;
}
