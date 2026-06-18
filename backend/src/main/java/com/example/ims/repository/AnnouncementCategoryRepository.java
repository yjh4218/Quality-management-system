package com.example.ims.repository;

import com.example.ims.entity.AnnouncementCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementCategoryRepository extends JpaRepository<AnnouncementCategory, Long> {
    List<AnnouncementCategory> findByIsDeletedFalseOrderBySortOrderAsc();
}
