package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "screen_sub_page")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScreenSubPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_screen_id", nullable = false)
    private DynamicScreen parentScreen;

    @Builder.Default
    @Column(name = "page_type", length = 20)
    private String pageType = "MODAL";

    @Column(name = "button_label", length = 50)
    private String buttonLabel;
}
