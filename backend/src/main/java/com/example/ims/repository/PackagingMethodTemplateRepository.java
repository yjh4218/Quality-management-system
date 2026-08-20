package com.example.ims.repository;

import com.example.ims.entity.PackagingMethodTemplate;
import com.example.ims.entity.ProductType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PackagingMethodTemplateRepository extends JpaRepository<PackagingMethodTemplate, Long> {
    Optional<PackagingMethodTemplate> findByProductType(ProductType productType);
}
