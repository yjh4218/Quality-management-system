package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
public class BugReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String reporterUsername;

    private String reporterName;

    @Column(nullable = false)
    private String screenName;

    @Column(length = 1000)
    private String url;

    @Column(columnDefinition = "TEXT")
    private String steps;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String serverError;

    @Builder.Default
    private String status = "OPEN"; // OPEN, IN_PROGRESS, RESOLVED, CLOSED

    @Builder.Default
    private String errorCategory = "UNKNOWN"; // NETWORK, RUNTIME, PROMISE, API_500, RENDER, UNKNOWN

    private String severity; // LOW, MEDIUM, HIGH, CRITICAL

    @Builder.Default
    private Integer occurrenceCount = 1;

    @org.springframework.data.annotation.CreatedDate
    private LocalDateTime createdAt;

    @org.springframework.data.annotation.LastModifiedDate
    private LocalDateTime updatedAt;
}
