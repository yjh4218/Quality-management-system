package com.example.ims.dto.dynamic;

import com.example.ims.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicScreenMetaResponse {
    private DynamicScreen screen;
    private List<SearchFieldDto> searchFields;
    private List<GridColumnDto> gridColumns;
    private List<UserViewDto> userViews;
    private SubPageDto subPage;
    private LinkedMenuDto menu;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LinkedMenuDto {
        private Long id;
        private String menuName;
        private String menuCode;
        private Long parentId;
        private String icon;
        private Integer menuOrder;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SearchFieldDto {
        private Long id;
        private Long catalogId;
        private String catalogKey;
        private String label;
        private String fieldType;
        private String componentKey;
        private Integer displayOrder;
        private MasterDataSource relationSource;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GridColumnDto {
        private Long id;
        private String fieldKey;
        private String label;
        private String fieldType;
        private Integer width;
        private Boolean sortable;
        private Boolean editable;
        private Integer displayOrder;
        private Boolean isMeasure;
        private Boolean isDimension;
        private String aggregationType;
        private Boolean isPrimaryDate;
        private Boolean isExcludedFromDashboard;
        private MasterDataSource relationSource;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserViewDto {
        private Long columnId;
        private String fieldKey;
        private Boolean isVisible;
        private Integer columnOrder;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubPageDto {
        private Long id;
        private String pageType;
        private String buttonLabel;
        private List<FormFieldDto> formFields;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FormFormFieldDto {
        private Long id;
        private String fieldKey;
        private String label;
        private String fieldType;
        private Boolean isRequired;
        private Integer displayOrder;
        private Integer maxFileCount;
        private String acceptedFileTypes;
        private MasterDataSource relationSource;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FormFieldDto {
        private Long id;
        private String fieldKey;
        private String label;
        private String fieldType;
        private Boolean isRequired;
        private Integer displayOrder;
        private Integer maxFileCount;
        private String acceptedFileTypes;
        private MasterDataSource relationSource;
    }
}
