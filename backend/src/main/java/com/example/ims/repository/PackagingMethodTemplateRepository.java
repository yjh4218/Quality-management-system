package com.example.ims.repository;

import com.example.ims.entity.PackagingMethodTemplate;
import com.example.ims.entity.ProductType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PackagingMethodTemplateRepository extends JpaRepository<PackagingMethodTemplate, Long> {
    Optional<PackagingMethodTemplate> findByProductType(ProductType productType);
}
