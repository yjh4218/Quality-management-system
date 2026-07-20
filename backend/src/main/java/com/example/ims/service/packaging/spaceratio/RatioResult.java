package com.example.ims.service.packaging.spaceratio;

import java.util.ArrayList;
import java.util.List;

public class RatioResult {
    private String country;
    private Double ratio;
    private String status;
    private String detailMessage;
    private String recommendedSpec;
    private List<String> flags = new ArrayList<>();

    public RatioResult() {}

    public RatioResult(String country, Double ratio, String status, String detailMessage, String recommendedSpec, List<String> flags) {
        this.country = country;
        this.ratio = ratio;
        this.status = status;
        this.detailMessage = detailMessage;
        this.recommendedSpec = recommendedSpec;
        this.flags = flags != null ? flags : new ArrayList<>();
    }

    // Getters and Setters
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

    // Builder
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String country;
        private Double ratio;
        private String status;
        private String detailMessage;
        private String recommendedSpec;
        private List<String> flags = new ArrayList<>();

        public Builder country(String v) { this.country = v; return this; }
        public Builder ratio(Double v) { this.ratio = v; return this; }
        public Builder status(String v) { this.status = v; return this; }
        public Builder detailMessage(String v) { this.detailMessage = v; return this; }
        public Builder recommendedSpec(String v) { this.recommendedSpec = v; return this; }
        public Builder flags(List<String> v) { this.flags = v; return this; }

        public RatioResult build() {
            return new RatioResult(country, ratio, status, detailMessage, recommendedSpec, flags);
        }
    }
}
