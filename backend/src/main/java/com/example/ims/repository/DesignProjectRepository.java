package com.example.ims.repository;

import com.example.ims.entity.DesignPhase;
import com.example.ims.entity.DesignProject;
import com.example.ims.entity.DesignProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DesignProjectRepository extends JpaRepository<DesignProject, Long> {

    Optional<DesignProject> findByProjectCode(String projectCode);

    boolean existsByProjectCode(String projectCode);

    Optional<DesignProject> findByDhfNumber(String dhfNumber);

    boolean existsByDhfNumber(String dhfNumber);

    @Query("SELECT p FROM DesignProject p WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           "LOWER(p.projectCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.projectName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.targetDeviceName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.dhfNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.projectLeader) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:phase IS NULL OR p.currentPhase = :phase) AND " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:dhfStatus IS NULL OR :dhfStatus = '' OR p.dhfStatus = :dhfStatus) " +
           "ORDER BY p.startDate DESC, p.id DESC")
    Page<DesignProject> searchProjects(@Param("keyword") String keyword,
                                       @Param("phase") DesignPhase phase,
                                       @Param("status") DesignProjectStatus status,
                                       @Param("dhfStatus") String dhfStatus,
                                       Pageable pageable);

    long countByStatus(DesignProjectStatus status);

    long countByDhfStatus(String dhfStatus);

    @Query("SELECT p.currentPhase, COUNT(p) FROM DesignProject p GROUP BY p.currentPhase")
    List<Object[]> countByPhaseGroup();

    @Query("SELECT p.status, COUNT(p) FROM DesignProject p GROUP BY p.status")
    List<Object[]> countByStatusGroup();
}
