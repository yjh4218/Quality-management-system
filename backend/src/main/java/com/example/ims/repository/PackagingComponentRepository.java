package com.example.ims.repository;

import com.example.ims.entity.PackagingComponent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PackagingComponentRepository extends JpaRepository<PackagingComponent, Long> {
    List<PackagingComponent> findByProductId(Long productId);
}
