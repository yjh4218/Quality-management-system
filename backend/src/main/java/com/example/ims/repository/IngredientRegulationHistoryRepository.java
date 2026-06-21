package com.example.ims.repository;

import com.example.ims.entity.IngredientRegulationHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IngredientRegulationHistoryRepository extends JpaRepository<IngredientRegulationHistory, Long> {
    
    Page<IngredientRegulationHistory> findByKoreanNameContainingOrInciNameContainingIgnoreCase(
            String koreanName, String inciName, Pageable pageable);

    java.util.Optional<IngredientRegulationHistory> findFirstByUpdatedByOrderByUpdatedAtDesc(String updatedBy);
}
