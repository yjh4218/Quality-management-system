package com.example.ims.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Dimensions {
    private Double width;
    private Double length;
    private Double height;

    private Double widthInch;
    private Double lengthInch;
    private Double heightInch;

    private Double volume; // Calculated or manual

    @jakarta.persistence.Column(columnDefinition = "VARCHAR(255) DEFAULT '가안'")
    private String status = "가안"; // "가안", "확정"
}
