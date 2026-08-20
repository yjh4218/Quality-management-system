package com.example.ims.repository;

import com.example.ims.entity.SystemPageGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemPageGuideRepository extends JpaRepository<SystemPageGuide, Long> {
    Optional<SystemPageGuide> findByPageKey(String pageKey);
}
