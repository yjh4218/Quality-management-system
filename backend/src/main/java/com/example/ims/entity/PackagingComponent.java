package com.example.ims.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * 포장 구성품 (PackagingComponent) 엔티티.
 * - 단품은 1개 기본 생성, 세트는 여러 개 구성품 추가 가능.
 * - 일본 세트박스 유리 용기 예외 판정을 위해 materialType을 가짐.
 */
@Entity
@Table(name = "packaging_components")
public class PackagingComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private Product product;

    @Column(name = "component_name", nullable = false)
    private String componentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "material_type", nullable = false)
    private MaterialType materialType = MaterialType.OTHER;

    @OneToMany(mappedBy = "component", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PackagingLayer> layers = new ArrayList<>();

    public PackagingComponent() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public String getComponentName() { return componentName; }
    public void setComponentName(String componentName) { this.componentName = componentName; }
    public MaterialType getMaterialType() { return materialType; }
    public void setMaterialType(MaterialType materialType) { this.materialType = materialType; }
    public List<PackagingLayer> getLayers() { return layers; }
    public void setLayers(List<PackagingLayer> layers) { this.layers = layers; }

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long productId;
        private String componentName;
        private MaterialType materialType = MaterialType.OTHER;
        private List<PackagingLayer> layers = new ArrayList<>();

        public Builder productId(Long v) { this.productId = v; return this; }
        public Builder componentName(String v) { this.componentName = v; return this; }
        public Builder materialType(MaterialType v) { this.materialType = v; return this; }
        public Builder layers(List<PackagingLayer> v) { this.layers = v; return this; }

        public PackagingComponent build() {
            PackagingComponent c = new PackagingComponent();
            c.productId = this.productId;
            c.componentName = this.componentName;
            c.materialType = this.materialType;
            c.layers = this.layers;
            return c;
        }
    }
}
