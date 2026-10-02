package com.example.ims.repository;

import com.example.ims.entity.DepartmentRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRoleRepository extends JpaRepository<DepartmentRole, Long> {

    @EntityGraph(attributePaths = {"department", "user"})
    Optional<DepartmentRole> findByDepartmentIdAndRoleCodeAndIsActiveTrue(Long departmentId, String roleCode);

    @EntityGraph(attributePaths = {"department", "user"})
    List<DepartmentRole> findByDepartmentIdAndIsActiveTrue(Long departmentId);

    @EntityGraph(attributePaths = {"department", "user"})
    List<DepartmentRole> findByDepartmentIdOrderByStartedAtDesc(Long departmentId);

    @EntityGraph(attributePaths = {"department", "user"})
    List<DepartmentRole> findByUserIdAndIsActiveTrue(Long userId);

    @EntityGraph(attributePaths = {"department", "user"})
    List<DepartmentRole> findByDepartmentCompanyNameAndIsActiveTrue(String companyName);
}
