package com.example.ims.repository;

import com.example.ims.entity.WidgetCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WidgetCatalogRepository extends JpaRepository<WidgetCatalog, Long> {
    Optional<WidgetCatalog> findByWidgetType(String widgetType);
}
