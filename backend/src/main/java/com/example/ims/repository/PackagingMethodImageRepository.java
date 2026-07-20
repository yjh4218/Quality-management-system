package com.example.ims.repository;

import com.example.ims.entity.PackagingMethodImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PackagingMethodImageRepository extends JpaRepository<PackagingMethodImage, Long> {

    @Query("SELECT p FROM PackagingMethodImage p WHERE p.packagingSpecId = :specId AND (p.deletedAt IS NULL) ORDER BY p.displayOrder ASC")
    List<PackagingMethodImage> findActiveBySpecId(@Param("specId") Long specId);
}
