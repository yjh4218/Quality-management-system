package com.example.ims.repository;

import com.example.ims.entity.DocumentRequirement;
import com.example.ims.entity.DocumentEnumType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRequirementRepository extends JpaRepository<DocumentRequirement, Long>, JpaSpecificationExecutor<DocumentRequirement> {
    
    List<DocumentRequirement> findByProductId(Long productId);
    
    List<DocumentRequirement> findByManufacturerId(Long manufacturerId);
    
    Optional<DocumentRequirement> findByProductIdAndDocumentEnumType(Long productId, DocumentEnumType type);
    
    Optional<DocumentRequirement> findByProductIdAndCustomDocumentTypeId(Long productId, Long customTypeId);
    
    Optional<DocumentRequirement> findByManufacturerIdAndCustomDocumentTypeId(Long manufacturerId, Long customTypeId);
}
