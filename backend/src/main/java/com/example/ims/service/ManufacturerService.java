package com.example.ims.service;

import com.example.ims.entity.Manufacturer;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ManufacturerService {

    private final ManufacturerRepository manufacturerRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    public List<Manufacturer> getAll(String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("User not found"));

        boolean isManufacturer = user.getRole().contains("ROLE_MANUFACTURER") || "제조사".equals(user.getDepartment());
        
        return manufacturerRepository.findAll().stream()
                .filter(Manufacturer::isActive)
                .filter(m -> {
                    if (isManufacturer) {
                        return m.getName().equals(user.getCompanyName());
                    }
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public Manufacturer save(Manufacturer manufacturer, String username) {
        if (manufacturer.getFiles() != null) {
            manufacturer.getFiles().forEach(file -> file.setManufacturer(manufacturer));
        }
        
        boolean isNew = manufacturer.getId() == null;
        Manufacturer oldManufacturer = isNew ? null : getById(manufacturer.getId());
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        
        String action = isNew ? "CREATE" : "UPDATE";
        String description = (isNew ? "신규 제조사 등록: " : "제조사 정보 수정: ") + saved.getName();
        
        auditLogService.logEntityChange("MANUFACTURER", saved.getId(), action, username, 
                null, username, null, null,
                description, oldManufacturer, saved);
        return saved;
    }

    @Transactional
    public void delete(Long id, String username) {
        Manufacturer manufacturer = getById(id);
        String oldJson = auditLogService.toCompactJson(manufacturer);
        manufacturer.setActive(false);
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        auditLogService.logEntityChange("MANUFACTURER", id, "DELETE", username, 
                null, username, null, null,
                "제조사 삭제(비활성화): " + manufacturer.getName(), oldJson, saved);
    }

    @Transactional
    public void restore(Long id, String username) {
        Manufacturer manufacturer = getById(id);
        manufacturer.setActive(true);
        Manufacturer saved = manufacturerRepository.save(manufacturer);
        auditLogService.logEntityChange("MANUFACTURER", id, "RESTORE", username, 
                null, username, null, null,
                "제조사 복구: " + manufacturer.getName(), manufacturer, saved);
    }

    @Transactional
    public void hardDelete(Long id, String username) {
        com.example.ims.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(
                         "User not found"));
        if (!user.getRole().contains("ADMIN")) {
            throw new RuntimeException("완전 삭제 권한이 없습니다. (관리자 전용)");
        }
        Manufacturer manufacturer = getById(id);
        manufacturerRepository.delete(manufacturer);
        auditLogService.logEntityChange("MANUFACTURER", id, "HARD_DELETE", username, 
                null, username, null, null,
                "제조사 완전 삭제: " + manufacturer.getName(), manufacturer, null);
    }

    public Manufacturer getById(Long id) {
        return manufacturerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Manufacturer not found"));
    }
}
