package com.example.ims.repository;

import com.example.ims.entity.AnnouncementCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementCategoryRepository extends JpaRepository<AnnouncementCategory, Long> {
    List<AnnouncementCategory> findByIsDeletedFalseOrderBySortOrderAsc();
}
