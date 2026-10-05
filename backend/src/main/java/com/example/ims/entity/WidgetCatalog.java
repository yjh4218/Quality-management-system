package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "widget_catalog")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WidgetCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "widget_type", nullable = false, length = 30)
    private String widgetType;

    @Column(name = "compatible_data_type", length = 20)
    private String compatibleDataType;

    @Column(name = "component_key", nullable = false, length = 50)
    private String componentKey;

    @Column(name = "design_token", length = 50)
    private String designToken;
}
