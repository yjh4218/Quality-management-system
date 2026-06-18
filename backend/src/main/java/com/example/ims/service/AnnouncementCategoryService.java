package com.example.ims.service;

import com.example.ims.entity.AnnouncementCategory;
import com.example.ims.repository.AnnouncementCategoryRepository;
import com.example.ims.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementCategoryService {

    private final AnnouncementCategoryRepository categoryRepository;
    private final AnnouncementRepository announcementRepository;

    @Transactional(readOnly = true)
    public List<AnnouncementCategory> getAllCategories() {
        return categoryRepository.findByIsDeletedFalseOrderBySortOrderAsc();
    }

    @Transactional(readOnly = true)
    public AnnouncementCategory getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("Category not found or deleted with ID: " + id));
    }

    @Transactional
    public AnnouncementCategory createCategory(AnnouncementCategory category) {
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Category name cannot be empty");
        }
        return categoryRepository.save(category);
    }

    @Transactional
    public AnnouncementCategory updateCategory(Long id, AnnouncementCategory details) {
        AnnouncementCategory category = getCategoryById(id);
        
        if (details.getName() != null && !details.getName().trim().isEmpty()) {
            category.setName(details.getName());
        }
        if (details.getColor() != null && !details.getColor().trim().isEmpty()) {
            category.setColor(details.getColor());
        }
        category.setBold(details.isBold());
        category.setSortOrder(details.getSortOrder());
        
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        AnnouncementCategory category = getCategoryById(id);
        category.setDeleted(true);
        categoryRepository.save(category);
        
        // Clean up referenced announcements
        announcementRepository.clearCategoryId(id);
    }
}
