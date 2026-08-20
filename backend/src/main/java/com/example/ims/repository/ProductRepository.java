package com.example.ims.repository;

import com.example.ims.entity.Product;
import com.example.ims.dto.ProductSummaryRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByItemCode(String itemCode);
    List<Product> findByIsMasterTrue();
    boolean existsByItemCode(String itemCode);
    List<Product> findByActiveTrue();

    @Query("SELECT DISTINCT p.manufacturerInfo.id FROM Product p WHERE p.active = true AND p.isMaster = true AND p.manufacturerInfo IS NOT NULL")
    List<Long> findActiveManufacturerIdsWithMasterProducts();
    
    @Query(value = "SELECT * FROM products WHERE is_deleted = true OR active = false ORDER BY updated_at DESC", nativeQuery = true)
    List<Product> findDeletedProducts();

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE products SET is_deleted = false, active = true WHERE id = :id", nativeQuery = true)
    void restoreProduct(Long id);
    List<Product> findByManufacturer(String manufacturer);
    List<Product> findTop50ByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime createdAt);

    @Query("SELECT p FROM Product p WHERE p.dimensions.status = :status ORDER BY p.createdAt DESC")
    List<Product> findTop50ByDimensionsStatus(@Param("status") String status);

    @Query("SELECT p FROM Product p WHERE p.createdAt > :createdAt AND p.dimensions.status = :status ORDER BY p.createdAt DESC")
    List<Product> findTop50ByCreatedAtAfterAndDimensionsStatus(@Param("createdAt") LocalDateTime createdAt, @Param("status") String status);

    /**
     * [성능 최적화] 생성자 프로젝션을 사용하여 N+1 문제를 해결합니다.
     */
    @Query("SELECT p FROM Product p " +
           "LEFT JOIN FETCH p.brand " + 
           "LEFT JOIN FETCH p.manufacturerInfo " +
           "WHERE p.active = true")
    Page<Product> findByActiveTrue(Pageable pageable);

    @Query(
        value = "SELECT DISTINCT new com.example.ims.dto.ProductSummaryRecord(" +
                "p.id, p.itemCode, p.productName, p.englishProductName, p.productType, " +
                "b.name, m.name, p.shelfLifeMonths, p.ingredients, p.isMaster, p.active, p.isPlanningSet, p.createdAt, " +
                "COALESCE(p.dimensions.status, '가안'), p.dimensions.width, p.dimensions.length, p.dimensions.height, p.weight, " +
                "p.inboxInfo.inboxQuantity, p.inboxInfo.inboxWeight, " +
                "p.outboxInfo.outboxQuantity, p.outboxInfo.outboxWeight, " +
                "p.palletInfo.palletQuantity, " +
                "p.packagingMaterial.materialBody, p.packagingMaterial.weightBody, " +
                "p.packagingMaterial.materialLabel, p.packagingMaterial.weightLabel, " +
                "p.packagingMaterial.materialCap, p.packagingMaterial.weightCap, " +
                "p.packagingMaterial.materialSealing, p.packagingMaterial.weightSealing, " +
                "p.packagingMaterial.materialPump, p.packagingMaterial.weightPump, " +
                "p.packagingMaterial.materialOuterBox, p.packagingMaterial.weightOuterBox, " +
                "p.packagingMaterial.materialTool, p.packagingMaterial.weightTool, " +
                "p.packagingMaterial.materialPacking, p.packagingMaterial.weightPacking, " +
                "p.packagingMaterial.materialEtc, p.packagingMaterial.weightEtc, " +
                "p.packagingMaterial.manufacturerContainer, p.packagingMaterial.manufacturerLabel, " +
                "p.packagingMaterial.manufacturerOuterBox, p.packagingMaterial.manufacturerEtc, " +
                "p.packagingMaterial.materialRemarks) " +
                "FROM Product p " +
                "LEFT JOIN p.manufacturerInfo m " +
                "LEFT JOIN p.brand b " +
                "LEFT JOIN p.channels ch " +
                "WHERE p.active = true AND " +
                "(COALESCE(:companyFilter, '') = '' OR m.name = :companyFilter) AND " +
                "(COALESCE(:itemCode, '') = '' OR LOWER(p.itemCode) LIKE :itemCode) AND " +
                "(COALESCE(:productName, '') = '' OR LOWER(p.productName) LIKE :productName) AND " +
                "(COALESCE(:englishProductName, '') = '' OR LOWER(p.englishProductName) LIKE :englishProductName) AND " +
                "(COALESCE(:brand, '') = '' OR (b IS NOT NULL AND LOWER(b.name) LIKE :brand)) AND " +
                "(COALESCE(:manufacturer, '') = '' OR (m IS NOT NULL AND LOWER(m.name) LIKE :manufacturer)) AND " +
                "(COALESCE(:ingredients, '') = '' OR LOWER(p.ingredients) LIKE :ingredients) AND " +
                "(:#{#channelNames == null} = true OR ch.name IN :channelNames) " +
                "ORDER BY p.createdAt DESC",
        countQuery = "SELECT count(DISTINCT p) FROM Product p LEFT JOIN p.manufacturerInfo m LEFT JOIN p.brand b LEFT JOIN p.channels ch WHERE "
                    + "p.active = true AND "
                    + "(COALESCE(:companyFilter, '') = '' OR m.name = :companyFilter) AND "
                    + "(COALESCE(:itemCode, '') = '' OR LOWER(p.itemCode) LIKE :itemCode) AND "
                    + "(COALESCE(:productName, '') = '' OR LOWER(p.productName) LIKE :productName) AND "
                    + "(COALESCE(:englishProductName, '') = '' OR LOWER(p.englishProductName) LIKE :englishProductName) AND "
                    + "(COALESCE(:brand, '') = '' OR (b IS NOT NULL AND LOWER(b.name) LIKE :brand)) AND "
                    + "(COALESCE(:manufacturer, '') = '' OR (m IS NOT NULL AND LOWER(m.name) LIKE :manufacturer)) AND "
                    + "(COALESCE(:ingredients, '') = '' OR LOWER(p.ingredients) LIKE :ingredients) AND "
                    + "(:#{#channelNames == null} = true OR ch.name IN :channelNames)"
    )
    Page<ProductSummaryRecord> searchProductsSummary(
                    @Param("companyFilter") String companyFilter,
                    @Param("itemCode") String itemCode,
                    @Param("productName") String productName,
                    @Param("englishProductName") String englishProductName,
                    @Param("brand") String brand,
                    @Param("manufacturer") String manufacturer,
                    @Param("ingredients") String ingredients,
                    @Param("channelNames") List<String> channelNames,
                    Pageable pageable);
}
