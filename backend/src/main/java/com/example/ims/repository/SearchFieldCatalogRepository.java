package com.example.ims.repository;

import com.example.ims.entity.SearchFieldCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SearchFieldCatalogRepository extends JpaRepository<SearchFieldCatalog, Long> {
    Optional<SearchFieldCatalog> findByCatalogKey(String catalogKey);
}
