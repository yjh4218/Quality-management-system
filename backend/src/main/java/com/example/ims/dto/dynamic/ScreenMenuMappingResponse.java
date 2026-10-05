package com.example.ims.dto.dynamic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenMenuMappingResponse {
    private Long screenId;
    private String screenCode;
    private String screenName;
    private String screenType;
    private String description;
    private Long menuId;
    private String menuName;
    private String menuCode;
    private Long parentMenuId;
    private String parentMenuName;
    private String icon;
    private Integer menuOrder;
    private Boolean isActive;
    private String createdAt;
    private Boolean isDynamic;
}
