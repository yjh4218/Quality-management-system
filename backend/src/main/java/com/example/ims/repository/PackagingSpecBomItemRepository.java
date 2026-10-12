package com.example.ims.repository;

import com.example.ims.entity.PackagingSpecBomItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PackagingSpecBomItemRepository extends JpaRepository<PackagingSpecBomItem, Long> {
    List<PackagingSpecBomItem> findByPackagingSpecId(Long packagingSpecId);

    @Query("SELECT b FROM PackagingSpecBomItem b " +
           "JOIN FETCH b.packagingSpec s " +
           "JOIN FETCH s.product p " +
           "LEFT JOIN FETCH p.brand br " +
           "LEFT JOIN FETCH p.manufacturerInfo m " +
           "LEFT JOIN FETCH b.masterMaterial mm " +
           "ORDER BY p.itemCode ASC, s.version DESC, b.sortOrder ASC, b.id ASC")
    List<PackagingSpecBomItem> findAllWithProduct();

    @Query("SELECT b FROM PackagingSpecBomItem b " +
           "JOIN FETCH b.packagingSpec s " +
           "JOIN FETCH s.product p " +
           "LEFT JOIN FETCH p.brand br " +
           "LEFT JOIN FETCH p.manufacturerInfo m " +
           "LEFT JOIN FETCH b.masterMaterial mm " +
           "WHERE p.id = :productId " +
           "ORDER BY p.itemCode ASC, s.version DESC, b.sortOrder ASC, b.id ASC")
    List<PackagingSpecBomItem> findAllByProductIdWithProduct(@Param("productId") Long productId);
}
