package com.example.ims.entity;

import jakarta.persistence.*;

/**
 * 관리자 지정 커스텀 추가 서류 (CustomDocumentType) 엔티티.
 */
@Entity
@Table(name = "custom_document_types")
public class CustomDocumentType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "period_months", nullable = false)
    private Integer periodMonths;

    @Column(name = "recurrence_type", nullable = false)
    private String recurrenceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentScope scope;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public CustomDocumentType() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getPeriodMonths() { return periodMonths; }
    public void setPeriodMonths(Integer periodMonths) { this.periodMonths = periodMonths; }
    public String getRecurrenceType() { return recurrenceType; }
    public void setRecurrenceType(String recurrenceType) { this.recurrenceType = recurrenceType; }
    public DocumentScope getScope() { return scope; }
    public void setScope(DocumentScope scope) { this.scope = scope; }
    public Boolean getIsActive() { return isActive; }
    public boolean isActive() { return isActive != null && isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String name;
        private Integer periodMonths;
        private String recurrenceType;
        private DocumentScope scope;
        private Boolean isActive = true;

        public Builder name(String v) { this.name = v; return this; }
        public Builder periodMonths(Integer v) { this.periodMonths = v; return this; }
        public Builder recurrenceType(String v) { this.recurrenceType = v; return this; }
        public Builder scope(DocumentScope v) { this.scope = v; return this; }
        public Builder isActive(Boolean v) { this.isActive = v; return this; }

        public CustomDocumentType build() {
            CustomDocumentType e = new CustomDocumentType();
            e.name = this.name;
            e.periodMonths = this.periodMonths;
            e.recurrenceType = this.recurrenceType;
            e.scope = this.scope;
            e.isActive = this.isActive;
            return e;
        }
    }

    @Override
    public String toString() {
        return "CustomDocumentType{id=" + id + ", name='" + name + "', scope=" + scope + "}";
    }
}
