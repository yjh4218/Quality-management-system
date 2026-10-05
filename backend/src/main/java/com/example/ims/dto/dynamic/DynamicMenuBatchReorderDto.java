package com.example.ims.dto.dynamic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicMenuBatchReorderDto {
    private Long id;
    private Long parentId;
    private Integer menuOrder;
}
