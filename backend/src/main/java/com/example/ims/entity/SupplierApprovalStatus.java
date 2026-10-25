package com.example.ims.entity;

/**
 * 🏭 공급업체 품질 적격성 승인 상태 (Supplier Approval Status)
 * Approved Supplier List (ASL) 통제
 */
public enum SupplierApprovalStatus {
    PENDING_QUALIFICATION("적격성 심사대기"),
    APPROVED("공식 승인 (거래가능)"),
    CONDITIONALLY_APPROVED("조건부 승인 (모니터링 대상)"),
    DISQUALIFIED("자격 미달 (거래 불가)"),
    SUSPENDED("잠정 거래 정지 (CAPA 진행중)");

    private final String description;

    SupplierApprovalStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
