package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "manufacturers")
@Getter
@Setter
@ToString(exclude = "files")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@lombok.EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Manufacturer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @lombok.EqualsAndHashCode.Include
    private Long id;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(nullable = false, unique = true)
    private String name; // 제조사명

    private String category; // 제조사 구분 (화장품, 부자재, 공산품, 반려동물 제품)
    private String identificationCode; // 제조사 식별코드
    private String manufacturerCode; // 제조사 고유 코드 (신규 추가)

    private String contactPerson; // 담당자명
    private String department; // 소속팀
    private String position; // 직급
    private String homepage;
    private String description;

    @Builder.Default
    private boolean active = true; // Soft delete flag

    private String phoneNumber; // 전화번호
    private String email; // 메일주소

    @OneToMany(mappedBy = "manufacturer", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @com.fasterxml.jackson.annotation.JsonManagedReference("manufacturer-files")
    @Builder.Default
    private java.util.List<ManufacturerFile> files = new java.util.ArrayList<>();
}
