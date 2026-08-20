package com.example.ims.repository;

import com.example.ims.entity.ProductHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductHistoryRepository extends JpaRepository<ProductHistory, Long> {
    List<ProductHistory> findByProductIdOrderByModifiedAtDesc(Long productId);
}
