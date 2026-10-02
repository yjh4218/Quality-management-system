package com.example.ims.repository;

import com.example.ims.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findByCompanyNameOrderByDisplayOrderAsc(String companyName);
    List<Department> findByCompanyNameAndIsActiveTrueOrderByDisplayOrderAsc(String companyName);
    Optional<Department> findByCompanyNameAndCode(String companyName, String code);
    Optional<Department> findByCompanyNameAndName(String companyName, String name);
    boolean existsByCompanyNameAndCode(String companyName, String code);
}
