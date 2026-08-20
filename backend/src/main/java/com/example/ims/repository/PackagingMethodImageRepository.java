package com.example.ims.repository;

import com.example.ims.entity.PackagingMethodImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PackagingMethodImageRepository extends JpaRepository<PackagingMethodImage, Long> {

    @Query("SELECT p FROM PackagingMethodImage p WHERE p.packagingSpecId = :specId AND (p.deletedAt IS NULL) ORDER BY p.displayOrder ASC")
    List<PackagingMethodImage> findActiveBySpecId(@Param("specId") Long specId);

    @Query("SELECT p FROM PackagingMethodImage p WHERE p.packagingSpecId IN :specIds AND (p.deletedAt IS NULL) ORDER BY p.displayOrder ASC")
    List<PackagingMethodImage> findActiveBySpecIds(@Param("specIds") List<Long> specIds);
}

