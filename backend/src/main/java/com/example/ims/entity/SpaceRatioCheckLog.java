package com.example.ims.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

/**
 * 포장공간비율 검증 이력 로그 엔티티
 */
@Entity
@Table(name = "space_ratio_check_logs")
@EntityListeners(AuditingEntityListener.class)
public class SpaceRatioCheckLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productId;
    private String itemCode;
    private String productName;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime checkedAt;

    @Column(columnDefinition = "TEXT")
    private String requestJson;

    @Column(columnDefinition = "TEXT")
    private String resultsJson;

    private String username;

    public SpaceRatioCheckLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public LocalDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(LocalDateTime checkedAt) { this.checkedAt = checkedAt; }
    public String getRequestJson() { return requestJson; }
    public void setRequestJson(String requestJson) { this.requestJson = requestJson; }
    public String getResultsJson() { return resultsJson; }
    public void setResultsJson(String resultsJson) { this.resultsJson = resultsJson; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long productId;
        private String itemCode;
        private String productName;
        private String requestJson;
        private String resultsJson;
        private String username;

        public Builder productId(Long v) { this.productId = v; return this; }
        public Builder itemCode(String v) { this.itemCode = v; return this; }
        public Builder productName(String v) { this.productName = v; return this; }
        public Builder requestJson(String v) { this.requestJson = v; return this; }
        public Builder resultsJson(String v) { this.resultsJson = v; return this; }
        public Builder username(String v) { this.username = v; return this; }

        public SpaceRatioCheckLog build() {
            SpaceRatioCheckLog log = new SpaceRatioCheckLog();
            log.productId = this.productId;
            log.itemCode = this.itemCode;
            log.productName = this.productName;
            log.requestJson = this.requestJson;
            log.resultsJson = this.resultsJson;
            log.username = this.username;
            return log;
        }
    }
}
