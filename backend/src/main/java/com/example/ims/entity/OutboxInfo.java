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
public class OutboxInfo {
    private Double outboxWidth;
    private Double outboxLength;
    private Double outboxHeight;
    private Double outboxWidthInch;
    private Double outboxLengthInch;
    private Double outboxHeightInch;

    private Integer outboxQuantity; // 입수량(ea)
    
    private Double outboxWeight; // 중량(kg)
    private Double outboxWeightLbs; // 중량(lbs)
}
