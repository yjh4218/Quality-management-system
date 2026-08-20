package com.example.ims.repository;

import com.example.ims.entity.BomCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BomCategoryRepository extends JpaRepository<BomCategory, Long> {
    List<BomCategory> findByActiveTrue();
}
