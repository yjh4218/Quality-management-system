package com.example.ims.service;

import com.example.ims.entity.BomCategory;
import com.example.ims.repository.BomCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BomCategoryService {

    private final BomCategoryRepository repository;
    private final com.example.ims.repository.UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<BomCategory> getAllActiveCategories() {
        return repository.findByActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<BomCategory> getAllCategories() {
        return repository.findAll();
    }

    @Transactional
    public BomCategory saveCategory(BomCategory category, String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username).orElseThrow();
        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        
        boolean isNew = category.getId() == null;
        Object oldState = isNew ? null : repository.findById(category.getId()).orElse(null);
        
        category.setUpdatedBy(username);
        BomCategory saved = repository.save(category);
        
        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("BOM_CATEGORY")
                .entityId(saved.getId())
                .action(isNew ? "CREATE" : "UPDATE")
                .modifier(modifierName)
                .description((isNew ? "BOM 유형 신규 등록: " : "BOM 유형 정보 수정: ") + saved.getMainType() + " > " + saved.getSubType())
                .oldEntity(oldState)
                .newEntity(saved)
                .build());
        
        return saved;
    }

    @Transactional
    public void softDelete(Long id, String username) {
        repository.findById(id).ifPresent(cat -> {
            com.example.ims.entity.User user = userRepository.findByUsername(username).orElseThrow();
            String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
            
            cat.setActive(false);
            cat.setUpdatedBy(username);
            repository.save(cat);
            
            eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                    .entityType("BOM_CATEGORY")
                    .entityId(id)
                    .action("DELETE")
                    .modifier(modifierName)
                    .description("BOM 유형 비활성화: " + cat.getMainType() + " > " + cat.getSubType())
                    .oldEntity(cat)
                    .newEntity("-")
                    .build());
            
            log.info("BOM Category Soft Deleted: ID={}, By={}", id, username);
        });
    }

    @Transactional
    public void hardDelete(Long id, String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username).orElseThrow();
        String modifierName = user.getName() + " (" + (user.getCompanyName() != null ? user.getCompanyName() : "시스템") + ")";
        
        BomCategory category = repository.findById(id).orElse(null);
        if (category != null) {
            repository.delete(category);
            
            eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                    .entityType("BOM_CATEGORY")
                    .entityId(id)
                    .action("HARD_DELETE")
                    .modifier(modifierName)
                    .description("BOM 유형 완전 삭제: " + category.getMainType() + " > " + category.getSubType())
                    .oldEntity(category)
                    .newEntity("-")
                    .build());
            
            log.warn("BOM Category HARD Deleted: ID={}, By={}", id, username);
        }
    }
}
