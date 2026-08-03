package com.example.ims.dto;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.PackagingSpecRevision;
import com.example.ims.entity.PackagingSpecComponent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * 포장사양서 및 하위 목록(개정 이력, 구성품 리스트) 통합 전송 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackagingSpecFullDto {
    private PackagingSpecification spec;
    private List<PackagingSpecRevision> revisions;
    private List<PackagingSpecComponent> components;
    private List<com.example.ims.entity.PackagingMethodImage> methodImages;
    private List<com.example.ims.entity.SalesChannel> selectedChannels;

    public PackagingSpecFullDto(PackagingSpecification spec, List<PackagingSpecRevision> revisions, List<PackagingSpecComponent> components, List<com.example.ims.entity.PackagingMethodImage> methodImages) {
        this.spec = spec;
        this.revisions = revisions;
        this.components = components;
        this.methodImages = methodImages;
    }
}
