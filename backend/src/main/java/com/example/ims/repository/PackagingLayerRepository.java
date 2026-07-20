package com.example.ims.repository;

import com.example.ims.entity.PackagingLayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PackagingLayerRepository extends JpaRepository<PackagingLayer, Long> {
    List<PackagingLayer> findByComponentIdOrderByLayerOrderAsc(Long componentId);
}
