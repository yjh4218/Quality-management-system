package com.example.ims.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecallReconciliationRequest {

    @NotNull(message = "출고 총 수량은 필수입니다.")
    private Integer shippedQuantity;

    @NotNull(message = "회수 수량은 필수입니다.")
    private Integer recalledQuantity;

    private Integer quarantinedQuantity;
    private Integer disposedQuantity;
    private Integer unretrievedQuantity;

    private String disposalMethod;
    private LocalDate disposalDate;
    private String disposalWitness;
    private String reconciliationNotes;
}
