package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "coa_request_logs", indexes = {
    @Index(name = "idx_coa_req_inbound_id", columnList = "inboundId"),
    @Index(name = "idx_coa_req_status", columnList = "status"),
    @Index(name = "idx_coa_req_manufacturer", columnList = "manufacturer"),
    @Index(name = "idx_coa_req_requested_at", columnList = "requestedAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@org.hibernate.annotations.SQLRestriction("(is_deleted = false OR is_deleted IS NULL)")
public class CoaRequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long inboundId;
    private String grnNumber;
    private String itemCode;
    private String productName;
    private String lotNumber;
    private String manufacturer;
    private String recipientEmail;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    private String requestedBy;

    @Builder.Default
    @Column(nullable = false)
    private String status = "REQUESTED"; // REQUESTED, REMINDED, FULFILLED

    @Builder.Default
    private Integer reminderCount = 0;

    private LocalDateTime lastRemindedAt;
    private LocalDateTime fulfilledAt;
    private Double leadTimeHours;

    @Builder.Default
    @Column(name = "is_deleted", columnDefinition = "boolean default false")
    private Boolean isDeleted = false;

    public boolean isDeleted() {
        return isDeleted != null && isDeleted;
    }
}
