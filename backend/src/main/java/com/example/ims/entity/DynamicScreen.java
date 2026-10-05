package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "dynamic_screen", indexes = {
    @Index(name = "idx_dynamic_screen_code", columnList = "screen_code", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicScreen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "screen_code", unique = true, nullable = false, length = 50)
    private String screenCode;

    @Column(name = "screen_name", nullable = false, length = 100)
    private String screenName;

    @Builder.Default
    @Column(name = "screen_type", length = 20)
    private String screenType = "GRID";

    @Column(name = "api_endpoint", length = 200)
    private String apiEndpoint;

    @Column(name = "target_table", length = 100)
    private String targetTable;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "enable_row_selection")
    private Boolean enableRowSelection = false;

    @Builder.Default
    @Column(name = "row_selection_mode", length = 10)
    private String rowSelectionMode = "MULTI";

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
