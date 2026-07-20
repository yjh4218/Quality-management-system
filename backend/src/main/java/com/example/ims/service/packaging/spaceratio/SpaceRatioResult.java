package com.example.ims.service.packaging.spaceratio;

import java.util.List;

public class SpaceRatioResult {
    private String country;
    private Double ratio;
    private String status;
    private String detailMessage;
    private String recommendedSpec;
    private List<String> flags;

    public SpaceRatioResult() {}

    public SpaceRatioResult(String country, Double ratio, String status, String detailMessage, String recommendedSpec, List<String> flags) {
        this.country = country;
        this.ratio = ratio;
        this.status = status;
        this.detailMessage = detailMessage;
        this.recommendedSpec = recommendedSpec;
        this.flags = flags;
    }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public Double getRatio() { return ratio; }
    public void setRatio(Double ratio) { this.ratio = ratio; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDetailMessage() { return detailMessage; }
    public void setDetailMessage(String detailMessage) { this.detailMessage = detailMessage; }

    public String getRecommendedSpec() { return recommendedSpec; }
    public void setRecommendedSpec(String recommendedSpec) { this.recommendedSpec = recommendedSpec; }

    public List<String> getFlags() { return flags; }
    public void setFlags(List<String> flags) { this.flags = flags; }
}
