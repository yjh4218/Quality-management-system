package com.example.ims.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

/**
 * Lightweight DTO for System Dashboard cards.
 * Avoids transmitting full entity data to improve performance.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardItemDTO {
    private Long id;
    private String code;     // itemCode or username or grnNumber
    private String name;     // productName or real name or description
    private String status;   // dimensionsStatus or overallStatus or action
    private String date;     // createdAt or modifiedAt or inboundDate
    private String category; // manufacturer or company or entityType
    private Map<String, Object> extraInfo; // Optional extra fields
}
