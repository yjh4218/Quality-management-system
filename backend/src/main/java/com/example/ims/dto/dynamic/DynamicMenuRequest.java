package com.example.ims.dto.dynamic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicMenuRequest {
    private String menuName;
    private String menuCode;
    private Long parentId;
    private String icon;
    private Integer menuOrder;
    private Long screenId;
    private String menuType;
    private Boolean isActive;
}
