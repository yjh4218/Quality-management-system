package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "screen_grid_user_view", uniqueConstraints = {
    @UniqueConstraint(name = "uk_screen_grid_user_view", columnNames = {"screen_id", "user_id", "column_id"})
}, indexes = {
    @Index(name = "idx_screen_grid_user_view_screen_user", columnList = "screen_id, user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenGridUserView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private DynamicScreen screen;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "column_id", nullable = false)
    private ScreenGridColumn column;

    @Builder.Default
    @Column(name = "is_visible")
    private Boolean isVisible = true;

    @Column(name = "column_order")
    private Integer columnOrder;
}
