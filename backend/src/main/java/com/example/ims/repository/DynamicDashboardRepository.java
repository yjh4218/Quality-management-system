package com.example.ims.repository;

import com.example.ims.entity.DynamicDashboard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DynamicDashboardRepository extends JpaRepository<DynamicDashboard, Long> {
    List<DynamicDashboard> findBySourceScreenId(Long sourceScreenId);
    Optional<DynamicDashboard> findFirstBySourceScreenIdOrderByCreatedAtDesc(Long sourceScreenId);
}
