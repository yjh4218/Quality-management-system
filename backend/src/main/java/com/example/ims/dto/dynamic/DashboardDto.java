package com.example.ims.dto.dynamic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardDto {
    private Long id;
    private Long sourceScreenId;
    private String dashboardName;
    private Long createdBy;
    private LocalDateTime createdAt;
    private List<WidgetDto> widgets;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WidgetDto {
        private Long id;
        private String widgetType;
        private String componentKey;
        private String designToken;
        private String boundFieldKey;
        private String secondaryFieldKey;
        private String title;
        private Integer positionX;
        private Integer positionY;
        private Integer width;
        private Integer height;
    }
}
