package com.example.ims.dto;

import com.example.ims.entity.EnvironmentalArea;
import com.example.ims.entity.EnvironmentalStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvironmentalMonitoringRequest {

    @NotNull(message = "모니터링 구역은 필수입니다.")
    private EnvironmentalArea area;

    @NotNull(message = "측정 일시는 필수입니다.")
    private LocalDateTime monitoringDate;

    private BigDecimal temperature;
    private BigDecimal humidity;
    private BigDecimal differentialPressure;
    private Integer airborneParticles05;
    private Integer airborneParticles50;
    private Integer microbialCount;

    @NotNull(message = "판정 상태는 필수입니다.")
    private EnvironmentalStatus status;

    @NotBlank(message = "측정 담당자는 필수입니다.")
    private String inspector;

    private String correctiveAction;
    private String remarks;
}
