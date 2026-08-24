package com.example.ims.repository;

import com.example.ims.entity.IngredientPrecautionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IngredientPrecautionRuleRepository extends JpaRepository<IngredientPrecautionRule, Long> {

    List<IngredientPrecautionRule> findByIsActiveTrue();

    @Query("SELECT r FROM IngredientPrecautionRule r WHERE r.isActive = true AND (LOWER(r.ingredientNameKr) IN :names OR (r.ingredientNameEn IS NOT NULL AND LOWER(r.ingredientNameEn) IN :names))")
    List<IngredientPrecautionRule> findMatchingRules(@Param("names") List<String> names);
}
