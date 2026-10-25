package com.example.ims.repository;

import com.example.ims.entity.ProductFamily;
import com.example.ims.entity.TrainingCategory;
import com.example.ims.entity.TrainingCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrainingCourseRepository extends JpaRepository<TrainingCourse, Long> {

    Optional<TrainingCourse> findByIdAndIsDeletedFalse(Long id);

    Optional<TrainingCourse> findByCourseCodeAndIsDeletedFalse(String courseCode);

    boolean existsByCourseCodeAndIsDeletedFalse(String courseCode);

    List<TrainingCourse> findByIsDeletedFalseOrderByCreatedAtDesc();

    @Query("SELECT tc FROM TrainingCourse tc WHERE tc.isDeleted = false " +
           "AND (:category IS NULL OR tc.category = :category) " +
           "AND (:targetFamily IS NULL OR tc.targetFamily = :targetFamily) " +
           "AND (:status IS NULL OR tc.status = :status) " +
           "AND (:keyword IS NULL OR LOWER(tc.courseName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(tc.courseCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(tc.targetAudience) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY tc.createdAt DESC")
    List<TrainingCourse> searchCourses(
            @Param("category") TrainingCategory category,
            @Param("targetFamily") ProductFamily targetFamily,
            @Param("status") String status,
            @Param("keyword") String keyword
    );

    long countByIsDeletedFalse();

    long countByIsDeletedFalseAndIsRequiredTrue();

    long countByIsDeletedFalseAndStatus(String status);
}
