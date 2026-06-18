package com.example.ims.service;

import com.example.ims.entity.Announcement;
import com.example.ims.entity.User;
import com.example.ims.entity.Manufacturer;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.AnnouncementRepository;
import com.example.ims.repository.UserRepository;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.AnnouncementCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;

import java.time.LocalDate;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 전체공지사항(Announcement) 서비스.
 * [디자인 표준] 소프트 델리트, ANC-YYYYMMDD-000 포맷 일련번호 자동 생성, 역할 기반 조회 필터링을 구현합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final ApplicationEventPublisher eventPublisher;
    private final ManufacturerRepository manufacturerRepository;
    private final EmailService emailService;
    private final AnnouncementCategoryRepository announcementCategoryRepository;

    /**
     * 모든 전체공지 목록 조회 (관리자 또는 공지 모니터링 관리 페이지용)
     */
    @Transactional(readOnly = true)
    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findByIsDeletedFalseOrderByCreatedAtDescAnnouncementNumberDesc();
    }

    /**
     * 특정 사용자에게 노출되는 활성 전체공지 필터링 조회 (대시보드 노출용)
     */
    @Transactional(readOnly = true)
    public List<Announcement> getActiveAnnouncementsForUser(String username) {
        List<Announcement> allActive = announcementRepository.findByIsDeletedFalseOrderByCreatedAtDescAnnouncementNumberDesc();

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return List.of();
        }

        // Admin은 모든 공지사항을 볼 수 있습니다.
        if (user.getRole() != null && user.getRole().contains("ADMIN")) {
            return allActive;
        }

        // ANNOUNCEMENT_ALL_VIEW 고급 권한 보유 여부 확인
        boolean hasAllViewPermission = false;
        if (user.getRole() != null) {
            String[] roles = user.getRole().split(",");
            for (String r : roles) {
                String roleKey = r.trim();
                if (!roleKey.startsWith("ROLE_")) {
                    roleKey = "ROLE_" + roleKey;
                }
                if (roleService.hasPermission(roleKey, "ANNOUNCEMENT_ALL_VIEW")) {
                    hasAllViewPermission = true;
                    break;
                }
            }
        }

        if (hasAllViewPermission) {
            return allActive;
        }

        // 사용자의 역할 리스트
        final List<String> userRoles = user.getRole() != null ? 
                Arrays.stream(user.getRole().split(","))
                        .map(String::trim)
                        .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                        .collect(Collectors.toList())
                : List.of();

        boolean isManufacturer = userRoles.contains("ROLE_MANUFACTURER");
        String manufacturerCategory = null;

        if (isManufacturer && user.getCompanyName() != null) {
            manufacturerCategory = manufacturerRepository.findByName(user.getCompanyName())
                    .map(Manufacturer::getCategory)
                    .orElse(null);
        }

        final String finalCategory = manufacturerCategory;

        // 사용자 대상 타입 및 역할에 맞춰 필터링
        return allActive.stream()
                .filter(announcement -> {
                    String targetType = announcement.getTargetType();
                    if (targetType == null) {
                        targetType = "ALL";
                    }

                    if ("ALL".equalsIgnoreCase(targetType)) {
                        return true;
                    }

                    if ("CATEGORY".equalsIgnoreCase(targetType)) {
                        if (!isManufacturer || finalCategory == null) return false;
                        return finalCategory.equalsIgnoreCase(announcement.getTargetCategory());
                    }

                    if ("MANUFACTURER".equalsIgnoreCase(targetType)) {
                        if (!isManufacturer || user.getCompanyName() == null) return false;
                        boolean companyMatch = user.getCompanyName().equalsIgnoreCase(announcement.getTargetManufacturer());
                        if (!companyMatch) return false;

                        String depts = announcement.getTargetDepartments();
                        if (depts == null || depts.trim().isEmpty()) {
                            return true; // 부서 설정이 안 되어 있으면 전체 노출
                        }
                        List<String> targetDepts = Arrays.stream(depts.split(","))
                                .map(String::trim)
                                .collect(Collectors.toList());
                        return user.getDepartment() != null && targetDepts.contains(user.getDepartment().trim());
                    }

                    // 하위 호환성 (targetRoles 필드가 지정되어 있는 경우)
                    String targetRoles = announcement.getTargetRoles();
                    if (targetRoles == null || targetRoles.trim().isEmpty()) {
                        // 기존 targetType이 카테고리명인 경우
                        if (isManufacturer && finalCategory != null && finalCategory.equalsIgnoreCase(targetType)) {
                            return true;
                        }
                        return false;
                    }
                    List<String> targetList = Arrays.stream(targetRoles.split(","))
                            .map(String::trim)
                            .collect(Collectors.toList());
                    return targetList.stream().anyMatch(userRoles::contains);
                })
                .collect(Collectors.toList());
    }

    /**
     * 전체공지 생성
     */
    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Announcement createAnnouncement(Announcement announcement, String modifier) {
        // 일련번호 생성 (ANC-YYYYMMDD-000)
        String newNumber = announcement.getAnnouncementNumber() != null ? announcement.getAnnouncementNumber().trim() : "";
        if (newNumber.isEmpty()) {
            String dateStr = LocalDate.now().toString().replace("-", "");
            Long seq = announcementRepository.getNextAnnouncementSequence();
            newNumber = String.format("ANC-%s-%03d", dateStr, seq);
        } else {
            // 중복 검증
            if (announcementRepository.findByAnnouncementNumber(newNumber).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 공지 번호입니다: " + newNumber);
            }
        }
        announcement.setAnnouncementNumber(newNumber);

        // 생성자 정보 세팅
        announcement.setCreatedByUsername(modifier);
        userRepository.findByUsername(modifier).ifPresent(u -> {
            announcement.setCreatedByName(u.getName());
        });
        announcement.setDeleted(false);

        Announcement saved = announcementRepository.save(announcement);

        // 변경 이력 이벤트 발행
        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("ANNOUNCEMENT")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(modifier)
                .description("Created new announcement: " + saved.getTitle() + " (" + newNumber + ")")
                .newEntity(saved)
                .build());

        return saved;
    }

    /**
     * 전체공지 수정
     */
    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public Announcement updateAnnouncement(Long id, Announcement details, String modifier) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found with id: " + id));

        Announcement oldSnapshot = Announcement.builder()
                .announcementNumber(announcement.getAnnouncementNumber())
                .title(announcement.getTitle())
                .content(announcement.getContent())
                .targetRoles(announcement.getTargetRoles())
                .categoryId(announcement.getCategoryId())
                .targetType(announcement.getTargetType())
                .targetCategory(announcement.getTargetCategory())
                .targetManufacturer(announcement.getTargetManufacturer())
                .targetDepartments(announcement.getTargetDepartments())
                .createdByUsername(announcement.getCreatedByUsername())
                .createdByName(announcement.getCreatedByName())
                .isDeleted(announcement.isDeleted())
                .build();

        // 공지번호 중복 검증 (본인이 아닌 다른 공지에서 이미 사용 중인지 확인)
        String newNum = details.getAnnouncementNumber() != null ? details.getAnnouncementNumber().trim() : "";
        if (newNum.isEmpty()) {
            throw new IllegalArgumentException("공지 번호는 필수 입력 사항입니다.");
        }
        if (!newNum.equals(announcement.getAnnouncementNumber())) {
            Optional<Announcement> existing = announcementRepository.findByAnnouncementNumber(newNum);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                throw new IllegalArgumentException("이미 사용 중인 공지 번호입니다: " + newNum);
            }
            announcement.setAnnouncementNumber(newNum);
        }

        announcement.setTitle(details.getTitle());
        announcement.setContent(details.getContent());
        announcement.setTargetRoles(details.getTargetRoles());
        announcement.setCategoryId(details.getCategoryId());
        announcement.setTargetType(details.getTargetType());
        announcement.setTargetCategory(details.getTargetCategory());
        announcement.setTargetManufacturer(details.getTargetManufacturer());
        announcement.setTargetDepartments(details.getTargetDepartments());

        Announcement updated = announcementRepository.save(announcement);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("ANNOUNCEMENT")
                .entityId(updated.getId())
                .action("UPDATE")
                .modifier(modifier)
                .description("Updated announcement: " + updated.getTitle() + " (" + updated.getAnnouncementNumber() + ")")
                .oldEntity(oldSnapshot)
                .newEntity(updated)
                .build());

        return updated;
    }

    /**
     * 전체공지 소프트 델리트
     */
    @Transactional
    @CacheEvict(value = "dashboard", allEntries = true)
    public void deleteAnnouncement(Long id, String modifier) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found with id: " + id));

        Announcement oldSnapshot = Announcement.builder()
                .announcementNumber(announcement.getAnnouncementNumber())
                .title(announcement.getTitle())
                .content(announcement.getContent())
                .targetRoles(announcement.getTargetRoles())
                .categoryId(announcement.getCategoryId())
                .targetType(announcement.getTargetType())
                .createdByUsername(announcement.getCreatedByUsername())
                .createdByName(announcement.getCreatedByName())
                .isDeleted(announcement.isDeleted())
                .build();

        announcement.setDeleted(true);
        announcementRepository.save(announcement);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("ANNOUNCEMENT")
                .entityId(id)
                .action("DELETE")
                .modifier(modifier)
                .description("Deleted announcement: " + announcement.getTitle() + " (" + announcement.getAnnouncementNumber() + ")")
                .oldEntity(oldSnapshot)
                .build());
    }

    /**
     * 지정된 대상 사용자들에게 전체공지 이메일 발송
     */
    @Transactional
    public void sendAnnouncementEmail(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found with id: " + id));

        // 영속화 방지: 카테고리가 널일 경우 강제 맵핑
        if (announcement.getCategory() == null && announcement.getCategoryId() != null) {
            announcementCategoryRepository.findById(announcement.getCategoryId()).ifPresent(announcement::setCategory);
        }

        List<User> targetUsers;
        String targetType = announcement.getTargetType() != null ? announcement.getTargetType() : "ALL";

        if ("ALL".equalsIgnoreCase(targetType)) {
            targetUsers = userRepository.findAll().stream()
                    .filter(User::isEnabled)
                    .filter(u -> u.getEmail() != null && !u.getEmail().trim().isEmpty())
                    .collect(Collectors.toList());
        } else if ("CATEGORY".equalsIgnoreCase(targetType)) {
            String targetCat = announcement.getTargetCategory();
            targetUsers = userRepository.findAll().stream()
                    .filter(User::isEnabled)
                    .filter(u -> u.getRole() != null && u.getRole().contains("ROLE_MANUFACTURER"))
                    .filter(u -> u.getEmail() != null && !u.getEmail().trim().isEmpty())
                    .filter(u -> {
                        if (u.getCompanyName() == null) return false;
                        String category = manufacturerRepository.findByName(u.getCompanyName())
                                .map(Manufacturer::getCategory)
                                .orElse("");
                        return category != null && category.equalsIgnoreCase(targetCat);
                    })
                    .collect(Collectors.toList());
        } else if ("MANUFACTURER".equalsIgnoreCase(targetType)) {
            String targetMfr = announcement.getTargetManufacturer();
            String targetDepts = announcement.getTargetDepartments();
            targetUsers = userRepository.findAll().stream()
                    .filter(User::isEnabled)
                    .filter(u -> u.getRole() != null && u.getRole().contains("ROLE_MANUFACTURER"))
                    .filter(u -> u.getEmail() != null && !u.getEmail().trim().isEmpty())
                    .filter(u -> targetMfr != null && targetMfr.equalsIgnoreCase(u.getCompanyName()))
                    .filter(u -> {
                        if (targetDepts == null || targetDepts.trim().isEmpty()) {
                            return true; // 부서 미지정 시 회사 소속 전체 발송
                        }
                        List<String> deptList = Arrays.stream(targetDepts.split(","))
                                .map(String::trim)
                                .collect(Collectors.toList());
                        return u.getDepartment() != null && deptList.contains(u.getDepartment().trim());
                    })
                    .collect(Collectors.toList());
        } else {
            // 하위 호환성 카테고리 매칭
            targetUsers = userRepository.findAll().stream()
                    .filter(User::isEnabled)
                    .filter(u -> u.getRole() != null && u.getRole().contains("ROLE_MANUFACTURER"))
                    .filter(u -> u.getEmail() != null && !u.getEmail().trim().isEmpty())
                    .filter(u -> {
                        if (u.getCompanyName() == null) return false;
                        String category = manufacturerRepository.findByName(u.getCompanyName())
                                .map(Manufacturer::getCategory)
                                .orElse("");
                        return category != null && category.equalsIgnoreCase(targetType);
                    })
                    .collect(Collectors.toList());
        }

        if (targetUsers.isEmpty()) {
            log.info("No target users found for announcement email: {}", announcement.getId());
            return;
        }

        // 이메일 발송
        for (User targetUser : targetUsers) {
            try {
                // local/prod 구분을 단순화하기 위해 baseUrl을 http://localhost:5173으로 지정하되, 
                // 필요시 프로파일이나 설정을 가져와서 셋팅할 수 있습니다. 
                emailService.sendAnnouncementNotificationEmail(targetUser.getEmail(), announcement, "http://localhost:5173");
            } catch (Exception e) {
                log.error("Failed to send announcement email to user: {}", targetUser.getUsername(), e);
            }
        }

        announcement.setEmailSent(true);
        announcement.setEmailSentAt(java.time.LocalDateTime.now());
        announcementRepository.save(announcement);
    }
}
