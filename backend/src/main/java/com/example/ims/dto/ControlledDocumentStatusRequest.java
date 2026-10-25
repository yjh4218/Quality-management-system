package com.example.ims.dto;

import com.example.ims.entity.ControlledDocStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ControlledDocumentStatusRequest {

    @NotNull(message = "변경할 상태를 지정해야 합니다.")
    private ControlledDocStatus status;

    private String reason;
}
