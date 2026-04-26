package com.example.ims.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductIngredientDto {
    private String korName;
    private String engName;
    private String contentPercent;
    private String contentPpm;
    private String contentPpb;
    private String inciName;
    private String allergenMark;
    private String limitClass;
}
