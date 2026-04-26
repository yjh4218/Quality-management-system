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
public class PalletInfo {
    private Double palletWidth;
    private Double palletLength;
    private Double palletHeight;
    private Double palletWidthInch;
    private Double palletLengthInch;
    private Double palletHeightInch;

    private Integer palletQuantity; // 적재수량(ea)
}
