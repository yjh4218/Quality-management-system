package com.example.ims.repository;

import com.example.ims.entity.SystemPageGuide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemPageGuideRepository extends JpaRepository<SystemPageGuide, Long> {
    Optional<SystemPageGuide> findByPageKey(String pageKey);
}
