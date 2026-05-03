package com.example.ims.repository;

import com.example.ims.entity.BomCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BomCategoryRepository extends JpaRepository<BomCategory, Long> {
    List<BomCategory> findByActiveTrue();
}
