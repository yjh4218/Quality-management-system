package com.example.ims.repository;

import com.example.ims.entity.CustomDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomDocumentTypeRepository extends JpaRepository<CustomDocumentType, Long> {
    List<CustomDocumentType> findByIsActiveTrue();
}
