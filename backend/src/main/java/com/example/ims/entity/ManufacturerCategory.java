package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "manufacturer_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ManufacturerCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    @jakarta.validation.constraints.NotBlank(message = "제조사 카테고리명은 필수입니다.")
    private String name;

    @Builder.Default
    @Column(name = "is_active")
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
