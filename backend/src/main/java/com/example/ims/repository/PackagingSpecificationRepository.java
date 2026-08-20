package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PackagingSpecificationRepository extends JpaRepository<PackagingSpecification, Long> {
    List<PackagingSpecification> findByProductId(Long productId);
}
