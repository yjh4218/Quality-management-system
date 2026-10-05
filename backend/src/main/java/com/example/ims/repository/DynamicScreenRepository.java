package com.example.ims.repository;

import com.example.ims.entity.DynamicScreen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DynamicScreenRepository extends JpaRepository<DynamicScreen, Long> {
    Optional<DynamicScreen> findByScreenCode(String screenCode);
    List<DynamicScreen> findByIsActiveTrue();
    List<DynamicScreen> findByIsActiveTrueOrderByCreatedAtDesc();
}
