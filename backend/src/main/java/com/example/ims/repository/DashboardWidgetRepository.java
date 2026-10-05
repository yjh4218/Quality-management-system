package com.example.ims.repository;

import com.example.ims.entity.DashboardWidget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DashboardWidgetRepository extends JpaRepository<DashboardWidget, Long> {
    List<DashboardWidget> findByDashboardId(Long dashboardId);
    void deleteByDashboardId(Long dashboardId);
}
