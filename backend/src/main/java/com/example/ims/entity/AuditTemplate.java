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
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
public class AuditTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String classificationName; // 분류명 (화장품 제조사 등)

    private String targetCategory; // 자동 맵핑 대상 제조사 분류 (화장품, 공산품 등)

    @Builder.Default
    @Column(name = "is_active", columnDefinition = "boolean default true")
    private boolean active = true;

    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean deleted = false;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (deleted == null) deleted = false;
    }

    // [호환성] 기존 코드에서 isDeleted() 호출 시 사용
    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void setIsDeleted(boolean val) {
        this.deleted = val;
    }

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonManagedReference("template-groups")
    private List<AuditTemplateGroup> groups = new ArrayList<>();
}
