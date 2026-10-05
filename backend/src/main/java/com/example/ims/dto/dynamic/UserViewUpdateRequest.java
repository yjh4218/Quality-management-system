package com.example.ims.dto.dynamic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserViewUpdateRequest {
    private List<ColumnViewSetting> settings;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ColumnViewSetting {
        private Long columnId;
        private Boolean isVisible;
        private Integer columnOrder;
    }
}
