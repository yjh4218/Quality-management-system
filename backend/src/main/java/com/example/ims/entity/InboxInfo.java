package com.example.ims.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InboxInfo {
    @Builder.Default
    private boolean hasInbox = true; // 없음 체크용

    private Double inboxWidth;
    private Double inboxLength;
    private Double inboxHeight;
    private Double inboxWidthInch;
    private Double inboxLengthInch;
    private Double inboxHeightInch;

    private Integer inboxQuantity; // 입수량(ea)
    
    private Double inboxWeight; // 중량(kg)
    private Double inboxWeightLbs; // 중량(lbs)
}
