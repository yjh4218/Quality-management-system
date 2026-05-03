package com.example.ims.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackagingRequest {
    private String lidMaterial;
    private String bodyMaterial;
    private String labelMaterial;
    private String otherMaterial;
}
