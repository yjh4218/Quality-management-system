package com.example.ims.repository;

import com.example.ims.entity.RegulatoryIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface RegulatoryIngredientRepository extends JpaRepository<RegulatoryIngredient, Long> {
    List<RegulatoryIngredient> findByInciName(String inciName);
    List<RegulatoryIngredient> findByKoreanName(String koreanName);
    List<RegulatoryIngredient> findByKoreanNameContaining(String koreanName);
    org.springframework.data.domain.Page<RegulatoryIngredient> findByKoreanNameContainingOrInciNameContainingIgnoreCase(String koreanName, String inciName, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<RegulatoryIngredient> findByKoreanNameContainingIgnoreCase(String koreanName, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<RegulatoryIngredient> findByInciNameContainingIgnoreCase(String inciName, org.springframework.data.domain.Pageable pageable);
    
    @Transactional
    void deleteBySourceApi(String sourceApi);
    
    long countBySourceApi(String sourceApi);
}

