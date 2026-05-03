package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "product_components")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductComponent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemCode;
    private String productName;
    private Integer quantity;
    private String capacity; // 용구 정보용 추가
    private String weight; // 중량 정보용 추가
}
