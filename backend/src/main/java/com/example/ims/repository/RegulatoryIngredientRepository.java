package com.example.ims.repository;

import com.example.ims.entity.RegulatoryIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RegulatoryIngredientRepository extends JpaRepository<RegulatoryIngredient, Long> {
    Optional<RegulatoryIngredient> findByInciName(String inciName);
}
