package com.example.ims.service.packaging.spaceratio;

import com.example.ims.entity.ContentType;

public class SpaceRatioRequest {
    private Double contentVolumeMl;
    private ContentType contentType;
    private Boolean isPlanningSet;
    private Double packagingWidth;
    private Double packagingLength;
    private Double packagingHeight;
    private Integer numberOfLayers;
    private Boolean isCleansingProduct;

    public SpaceRatioRequest() {}

    public Double getContentVolumeMl() { return contentVolumeMl; }
    public void setContentVolumeMl(Double contentVolumeMl) { this.contentVolumeMl = contentVolumeMl; }

    public ContentType getContentType() { return contentType; }
    public void setContentType(ContentType contentType) { this.contentType = contentType; }

    public Boolean getIsPlanningSet() { return isPlanningSet; }
    public void setIsPlanningSet(Boolean isPlanningSet) { this.isPlanningSet = isPlanningSet; }

    public Double getPackagingWidth() { return packagingWidth; }
    public void setPackagingWidth(Double packagingWidth) { this.packagingWidth = packagingWidth; }

    public Double getPackagingLength() { return packagingLength; }
    public void setPackagingLength(Double packagingLength) { this.packagingLength = packagingLength; }

    public Double getPackagingHeight() { return packagingHeight; }
    public void setPackagingHeight(Double packagingHeight) { this.packagingHeight = packagingHeight; }

    public Integer getNumberOfLayers() { return numberOfLayers; }
    public void setNumberOfLayers(Integer numberOfLayers) { this.numberOfLayers = numberOfLayers; }

    public Boolean getIsCleansingProduct() { return isCleansingProduct; }
    public void setIsCleansingProduct(Boolean isCleansingProduct) { this.isCleansingProduct = isCleansingProduct; }
}
