package com.example.ims.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

/**
 * 품목 또는 제조사별 필수 서류 요구사항 (DocumentRequirement) 엔티티.
 */
@Entity
@Getter
@Setter
@Table(name = "document_requirements")
public class DocumentRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id")
    private Long productId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;

    @Column(name = "manufacturer_id")
    private Long manufacturerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", insertable = false, updatable = false)
    private Manufacturer manufacturer;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_enum_type")
    private DocumentEnumType documentEnumType;

    @Column(name = "custom_document_type_id")
    private Long customDocumentTypeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_document_type_id", insertable = false, updatable = false)
    private CustomDocumentType customDocumentType;

    @Column(name = "last_received_date")
    private LocalDate lastReceivedDate;

    @Column(name = "next_due_date")
    private LocalDate nextDueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Column(name = "security_token")
    private String securityToken;

    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    @Column(name = "last_uploaded_by")
    private String lastUploadedBy;

    @Column(name = "last_uploaded_at")
    private LocalDateTime lastUploadedAt;

    public DocumentRequirement() {}

    @PrePersist
    @PreUpdate
    public void validateRequirementScope() {
        boolean hasProduct = (productId != null);
        boolean hasManufacturer = (manufacturerId != null);
        if (hasProduct && hasManufacturer) {
            throw new IllegalStateException("정합성 위반: product_id 와 manufacturer_id는 동시에 지정될 수 없습니다.");
        }
        if (!hasProduct && !hasManufacturer) {
            throw new IllegalStateException("정합성 위반: product_id 혹은 manufacturer_id 중 하나는 필수입니다.");
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public Long getManufacturerId() { return manufacturerId; }
    public void setManufacturerId(Long manufacturerId) { this.manufacturerId = manufacturerId; }
    public Manufacturer getManufacturer() { return manufacturer; }
    public void setManufacturer(Manufacturer manufacturer) { this.manufacturer = manufacturer; }
    public DocumentEnumType getDocumentEnumType() { return documentEnumType; }
    public void setDocumentEnumType(DocumentEnumType documentEnumType) { this.documentEnumType = documentEnumType; }
    public Long getCustomDocumentTypeId() { return customDocumentTypeId; }
    public void setCustomDocumentTypeId(Long customDocumentTypeId) { this.customDocumentTypeId = customDocumentTypeId; }
    public CustomDocumentType getCustomDocumentType() { return customDocumentType; }
    public void setCustomDocumentType(CustomDocumentType customDocumentType) { this.customDocumentType = customDocumentType; }
    public LocalDate getLastReceivedDate() { return lastReceivedDate; }
    public void setLastReceivedDate(LocalDate lastReceivedDate) { this.lastReceivedDate = lastReceivedDate; }
    public LocalDate getNextDueDate() { return nextDueDate; }
    public void setNextDueDate(LocalDate nextDueDate) { this.nextDueDate = nextDueDate; }
    public DocumentStatus getStatus() { return status; }
    public void setStatus(DocumentStatus status) { this.status = status; }

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long productId;
        private Long manufacturerId;
        private DocumentEnumType documentEnumType;
        private Long customDocumentTypeId;
        private LocalDate lastReceivedDate;
        private LocalDate nextDueDate;
        private DocumentStatus status = DocumentStatus.PENDING;

        public Builder productId(Long v) { this.productId = v; return this; }
        public Builder manufacturerId(Long v) { this.manufacturerId = v; return this; }
        public Builder documentEnumType(DocumentEnumType v) { this.documentEnumType = v; return this; }
        public Builder customDocumentTypeId(Long v) { this.customDocumentTypeId = v; return this; }
        public Builder lastReceivedDate(LocalDate v) { this.lastReceivedDate = v; return this; }
        public Builder nextDueDate(LocalDate v) { this.nextDueDate = v; return this; }
        public Builder status(DocumentStatus v) { this.status = v; return this; }

        public DocumentRequirement build() {
            DocumentRequirement e = new DocumentRequirement();
            e.productId = this.productId;
            e.manufacturerId = this.manufacturerId;
            e.documentEnumType = this.documentEnumType;
            e.customDocumentTypeId = this.customDocumentTypeId;
            e.lastReceivedDate = this.lastReceivedDate;
            e.nextDueDate = this.nextDueDate;
            e.status = this.status;
            return e;
        }
    }
}
