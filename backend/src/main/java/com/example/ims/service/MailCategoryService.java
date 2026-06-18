package com.example.ims.service;

import com.example.ims.entity.MailCategory;
import com.example.ims.repository.MailCategoryRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MailCategoryService {

    @Autowired
    private MailCategoryRepository repository;

    @PostConstruct
    public void initDefaultCategories() {
        if (repository.findByCategoryCodeAndDeletedFalse("CLAIM").isEmpty()) {
            MailCategory claimCategory = MailCategory.builder()
                    .categoryCode("CLAIM")
                    .categoryName("클레임 관리")
                    .availableVariables("claimNumber:클레임 문서번호, productName:제품명, itemCode:품목코드, lotNumber:로트번호, occurrenceQty:접수수량, claimContent:클레임 내용, claimPhotos:클레임 사진들, claimLink:상세 보기 링크")
                    .build();
            repository.save(claimCategory);
        }

        if (repository.findByCategoryCodeAndDeletedFalse("PRODUCTION_AUDIT").isEmpty()) {
            MailCategory auditCategory = MailCategory.builder()
                    .categoryCode("PRODUCTION_AUDIT")
                    .categoryName("신제품 생산감리")
                    .availableVariables("itemCode:품목코드, productName:제품명, productionAuditLink:생산감리 링크")
                    .build();
            repository.save(auditCategory);
        }
    }

    public List<MailCategory> getAllCategories() {
        return repository.findByDeletedFalseOrderByCategoryCodeAsc();
    }

    public MailCategory getCategoryByCode(String code) {
        return repository.findByCategoryCodeAndDeletedFalse(code).orElse(null);
    }

    @Transactional
    public MailCategory saveCategory(MailCategory category) {
        if (category.getId() != null) {
            MailCategory existing = repository.findById(category.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            existing.setCategoryName(category.getCategoryName());
            existing.setAvailableVariables(category.getAvailableVariables());
            return repository.save(existing);
        }
        
        // If not duplicate, save it
        if (repository.findByCategoryCodeAndDeletedFalse(category.getCategoryCode()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 카테고리 코드입니다.");
        }
        return repository.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        MailCategory category = repository.findById(id).orElse(null);
        if (category != null) {
            category.setDeleted(true);
            repository.save(category);
        }
    }
}
