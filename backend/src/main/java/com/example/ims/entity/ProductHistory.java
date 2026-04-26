package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private String modifier; // Login ID

    private Long modifierId;
    private String modifierUsername;
    private String modifierName;
    private String modifierCompany;

    @CreationTimestamp
    private LocalDateTime modifiedAt;

    private String fieldName;
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String oldValue;
    @Column(columnDefinition = "TEXT")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    private String newValue;
}
