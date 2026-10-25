package com.example.ims.repository;

import com.example.ims.entity.CsvValidationProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CsvValidationProjectRepository extends JpaRepository<CsvValidationProject, Long> {
    Optional<CsvValidationProject> findByProjectCodeAndIsDeletedFalse(String projectCode);
    List<CsvValidationProject> findByIsDeletedFalseOrderByPlannedStartDateDesc();
    long countByIsDeletedFalse();
}
