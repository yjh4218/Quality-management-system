package com.example.ims.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "product_ingredients")
public class ProductIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonBackReference
    private Product product;

    @Column(name = "kor_name", length = 255)
    private String korName;

    @Column(name = "eng_name", length = 255)
    private String engName;

    @Column(name = "content_percent", length = 50)
    private String contentPercent;

    @Column(name = "content_ppm", length = 50)
    private String contentPpm;

    @Column(name = "content_ppb", length = 50)
    private String contentPpb;

    @Column(name = "inci_name", length = 255)
    private String inciName;

    @Column(name = "allergen_mark", length = 255)
    private String allergenMark;

    @Column(name = "limit_class", length = 255)
    private String limitClass;
}
