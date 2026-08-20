package com.example.ims.repository;

import com.example.ims.entity.PackagingLayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PackagingLayerRepository extends JpaRepository<PackagingLayer, Long> {
    List<PackagingLayer> findByComponentIdOrderByLayerOrderAsc(Long componentId);
}
