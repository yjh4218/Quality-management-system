package com.example.ims.repository;

import com.example.ims.entity.RegulatoryIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RegulatoryIngredientRepository extends JpaRepository<RegulatoryIngredient, Long> {
    List<RegulatoryIngredient> findByInciName(String inciName);
    List<RegulatoryIngredient> findByKoreanNameContaining(String koreanName);
    void deleteBySourceApi(String sourceApi);
    long countBySourceApi(String sourceApi);
}
