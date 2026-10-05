package com.example.ims.dto.dynamic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicMenuResponse {
    private Long id;
    private Long parentId;
    private String menuName;
    private String menuCode;
    private Integer menuOrder;
    private Long screenId;
    private String screenCode;
    private String screenType;
    private Boolean isDynamicScreen;
    private String menuType;
    private Boolean isSystem;
    private String createdAt;
    private String icon;
    private Boolean canCreate;
    private Boolean canEdit;
    private Boolean canDelete;

    @Builder.Default
    private List<DynamicMenuResponse> children = new ArrayList<>();
}
