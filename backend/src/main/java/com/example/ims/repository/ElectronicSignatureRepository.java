package com.example.ims.repository;

import com.example.ims.entity.ElectronicSignature;
import com.example.ims.entity.SignatureMeaning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ElectronicSignatureRepository extends JpaRepository<ElectronicSignature, Long> {

    Optional<ElectronicSignature> findBySignatureNumber(String signatureNumber);

    List<ElectronicSignature> findByDocumentTypeAndTargetIdOrderBySignedAtDesc(String documentType, Long targetId);

    List<ElectronicSignature> findAllByOrderBySignedAtDesc();

    long countBySignatureMeaning(SignatureMeaning signatureMeaning);

    long countByIsRevokedFalse();
}
