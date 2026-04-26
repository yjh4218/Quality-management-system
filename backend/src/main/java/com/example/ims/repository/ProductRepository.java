package com.example.ims.repository;

import com.example.ims.entity.Product;
import com.example.ims.dto.ProductSummaryRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByItemCode(String itemCode);
    boolean existsByItemCode(String itemCode);
    List<Product> findByActiveTrue();
    List<Product> findByActiveFalseOrderByUpdatedAtDesc();
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
        value = "SELECT new com.example.ims.dto.ProductSummaryRecord(" +
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
                "WHERE p.active = true AND " +
                "(:companyFilter IS NULL OR m.name = :companyFilter) AND " +
                "(:itemCode IS NULL OR LOWER(CAST(p.itemCode AS String)) LIKE :itemCode) AND " +
                "(:productName IS NULL OR LOWER(CAST(p.productName AS String)) LIKE :productName) AND " +
                "(:englishProductName IS NULL OR LOWER(CAST(p.englishProductName AS String)) LIKE :englishProductName) AND " +
                "(:brand IS NULL OR (b IS NOT NULL AND LOWER(CAST(b.name AS String)) LIKE :brand)) AND " +
                "(:manufacturer IS NULL OR (m IS NOT NULL AND LOWER(CAST(m.name AS String)) LIKE :manufacturer)) AND " +
                "(:ingredients IS NULL OR LOWER(CAST(p.ingredients AS String)) LIKE :ingredients) " +
                "ORDER BY p.createdAt DESC",
        countQuery = "SELECT count(p) FROM Product p LEFT JOIN p.manufacturerInfo m LEFT JOIN p.brand b WHERE "
                    + "p.active = true AND "
                    + "(:companyFilter IS NULL OR m.name = :companyFilter) AND "
                    + "(:itemCode IS NULL OR LOWER(CAST(p.itemCode AS String)) LIKE :itemCode) AND "
                    + "(:productName IS NULL OR LOWER(CAST(p.productName AS String)) LIKE :productName) AND "
                    + "(:englishProductName IS NULL OR LOWER(CAST(p.englishProductName AS String)) LIKE :englishProductName) AND "
                    + "(:brand IS NULL OR (b IS NOT NULL AND LOWER(CAST(b.name AS String)) LIKE :brand)) AND "
                    + "(:manufacturer IS NULL OR (m IS NOT NULL AND LOWER(CAST(m.name AS String)) LIKE :manufacturer)) AND "
                    + "(:ingredients IS NULL OR LOWER(CAST(p.ingredients AS String)) LIKE :ingredients)"
    )
    Page<ProductSummaryRecord> searchProductsSummary(
                    @Param("companyFilter") String companyFilter,
                    @Param("itemCode") String itemCode,
                    @Param("productName") String productName,
                    @Param("englishProductName") String englishProductName,
                    @Param("brand") String brand,
                    @Param("manufacturer") String manufacturer,
                    @Param("ingredients") String ingredients,
                    Pageable pageable);
}
