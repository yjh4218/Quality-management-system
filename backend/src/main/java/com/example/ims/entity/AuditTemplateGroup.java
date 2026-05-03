package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "audit_template_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AuditTemplateGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("template-groups")
    private AuditTemplate template;

    @Column(nullable = false)
    private String groupName; // 점검항목명 (운영관리 등)

    private int displayOrder;

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonManagedReference("group-items")
    private List<AuditTemplateItem> items = new ArrayList<>();
}
