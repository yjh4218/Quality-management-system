package com.example.ims.repository;

import com.example.ims.entity.MedicalDeviceProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalDeviceProductRepository extends JpaRepository<MedicalDeviceProduct, Long> {

    Optional<MedicalDeviceProduct> findByItemCode(String itemCode);

    boolean existsByItemCode(String itemCode);

    @Query("SELECT m FROM MedicalDeviceProduct m WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           "LOWER(m.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.productName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.modelName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.licenseNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.udiDi) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:deviceClass IS NULL OR :deviceClass = '' OR m.deviceClassification = :deviceClass) " +
           "ORDER BY m.createdAt DESC")
    Page<MedicalDeviceProduct> searchDevices(@Param("keyword") String keyword,
                                            @Param("deviceClass") String deviceClass,
                                            Pageable pageable);

    @Query("SELECT m.deviceClassification, COUNT(m) FROM MedicalDeviceProduct m GROUP BY m.deviceClassification")
    List<Object[]> countByClassificationGroup();

    long countByUdiDiIsNotNullAndUdiDiNot(String empty);
}
