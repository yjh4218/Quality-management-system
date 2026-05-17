package com.example.ims.repository;

import com.example.ims.entity.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {
    Optional<Manufacturer> findByName(String name);

    // [휴지통] 삭제된 항목 조회
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM manufacturers WHERE is_deleted = true OR active = false ORDER BY updated_at DESC", nativeQuery = true)
    java.util.List<Manufacturer> findDeletedManufacturers();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE manufacturers SET is_deleted = false, active = true WHERE id = :id", nativeQuery = true)
    void restoreManufacturer(Long id);
}
