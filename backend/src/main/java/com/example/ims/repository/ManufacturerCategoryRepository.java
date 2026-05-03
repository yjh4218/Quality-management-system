package com.example.ims.repository;

import com.example.ims.entity.ManufacturerCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ManufacturerCategoryRepository extends JpaRepository<ManufacturerCategory, Long> {
    List<ManufacturerCategory> findByActiveTrueOrderByNameAsc();
}
