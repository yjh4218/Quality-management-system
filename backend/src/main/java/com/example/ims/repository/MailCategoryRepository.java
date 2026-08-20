package com.example.ims.repository;

import com.example.ims.entity.MailCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MailCategoryRepository extends JpaRepository<MailCategory, Long> {
    List<MailCategory> findByDeletedFalseOrderByCategoryCodeAsc();
    Optional<MailCategory> findByCategoryCodeAndDeletedFalse(String categoryCode);
}
