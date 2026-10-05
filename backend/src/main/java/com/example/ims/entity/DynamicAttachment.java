package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "dynamic_attachment", indexes = {
    @Index(name = "idx_dynamic_attachment_record", columnList = "screen_id, record_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DynamicAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private DynamicScreen screen;

    @Column(name = "record_id", nullable = false)
    private Long recordId;

    @Column(name = "field_key", nullable = false, length = 50)
    private String fieldKey;

    @Column(name = "stored_file_path", nullable = false, length = 500)
    private String storedFilePath;

    @Builder.Default
    @Column(name = "file_type", length = 20)
    private String fileType = "FILE";

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
