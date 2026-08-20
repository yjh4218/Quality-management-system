package com.example.ims.repository;

import com.example.ims.entity.CustomDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomDocumentTypeRepository extends JpaRepository<CustomDocumentType, Long> {
    List<CustomDocumentType> findByIsActiveTrue();
}
