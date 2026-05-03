package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PackagingSpecificationRepository extends JpaRepository<PackagingSpecification, Long> {
    List<PackagingSpecification> findByProductId(Long productId);
}
