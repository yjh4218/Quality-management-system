package com.example.ims.dto;

import com.example.ims.entity.QuarantineStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrQuarantineUpdateRequest {

    @NotNull(message = "격리 상태는 필수입니다.")
    private QuarantineStatus quarantineStatus;

    private String quarantineLocation;

    private String notes;
}
