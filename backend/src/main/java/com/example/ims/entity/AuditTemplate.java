package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "audit_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AuditTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String classificationName; // 분류명 (화장품 제조사 등)

    private String targetCategory; // 자동 맵핑 대상 제조사 분류 (화장품, 공산품 등)

    @Builder.Default
    @Column(name = "is_active")
    private boolean active = true;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonManagedReference("template-groups")
    private List<AuditTemplateGroup> groups = new ArrayList<>();
}
