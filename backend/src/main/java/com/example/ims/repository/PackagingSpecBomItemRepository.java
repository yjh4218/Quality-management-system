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
           "WHERE (:productId IS NULL OR p.id = :productId) " +
           "AND (:itemCode IS NULL OR LOWER(p.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%'))) " +
           "AND (:keyword IS NULL OR (" +
           "   LOWER(p.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "   LOWER(p.productName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "   LOWER(COALESCE(br.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "   LOWER(COALESCE(mm.bomCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "   LOWER(COALESCE(mm.componentName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "   LOWER(COALESCE(mm.type, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "   LOWER(COALESCE(mm.material, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
           ")) " +
           "AND (:bomType IS NULL OR mm.type = :bomType) " +
           "ORDER BY p.itemCode ASC, s.version DESC, b.sortOrder ASC, b.id ASC")
    List<PackagingSpecBomItem> searchBomItemsWithProduct(
            @Param("productId") Long productId,
            @Param("itemCode") String itemCode,
            @Param("keyword") String keyword,
            @Param("bomType") String bomType
    );
}
