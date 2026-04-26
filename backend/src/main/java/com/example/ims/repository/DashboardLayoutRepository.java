package com.example.ims.repository;

import com.example.ims.entity.DashboardLayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DashboardLayoutRepository extends JpaRepository<DashboardLayout, Long> {
    Optional<DashboardLayout> findByName(String name);
}
