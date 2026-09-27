package com.example.ims.service;

import com.example.ims.dto.UserRecipientDto;
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
import java.util.Collections;
import java.util.List;
import java.util.Objects;
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

    @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

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
    @CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
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

        // [알림 연동] 공지사항 등록 시 매핑된 알림 이벤트 발행
        eventPublisher.publishEvent(com.example.ims.event.NotificationEvent.builder()
                .sourceDomain("ANNOUNCEMENT")
                .sourceAction("CREATE")
                .title("📣 신규 공지사항 등록 알림")
                .message(String.format("새로운 공지사항이 등록되었습니다: %s", saved.getTitle()))
                .category("ANNOUNCEMENT")
                .linkUrl("/announcements")
                .build());

        return saved;
    }

    /**
     * 전체공지 수정
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
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

        // 공지번호 유지 또는 갱신 검증
        String newNum = details.getAnnouncementNumber() != null ? details.getAnnouncementNumber().trim() : "";
        if (!newNum.isEmpty() && !newNum.equals(announcement.getAnnouncementNumber())) {
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
    @CacheEvict(value = {"dashboard", "dashboard_stats"}, allEntries = true)
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
        sendAnnouncementEmail(id, null);
    }

    /**
     * 커스텀 수신 대상자 또는 기존 타겟 대상자에게 전체공지 이메일 발송
     */
    @Transactional
    public void sendAnnouncementEmail(Long id, List<String> customRecipientEmails) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found with id: " + id));

        // 영속화 방지: 카테고리가 널일 경우 강제 맵핑
        if (announcement.getCategory() == null && announcement.getCategoryId() != null) {
            announcementCategoryRepository.findById(announcement.getCategoryId()).ifPresent(announcement::setCategory);
        }

        List<String> targetEmails;
        if (customRecipientEmails != null && !customRecipientEmails.isEmpty()) {
            targetEmails = customRecipientEmails.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(e -> !e.isEmpty() && e.contains("@"))
                    .distinct()
                    .collect(Collectors.toList());
        } else {
            List<User> targetUsers = resolveTargetUsers(
                    announcement.getTargetType(),
                    announcement.getTargetCategory(),
                    announcement.getTargetManufacturer(),
                    announcement.getTargetDepartments()
            );
            targetEmails = targetUsers.stream()
                    .map(User::getEmail)
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(e -> !e.isEmpty() && e.contains("@"))
                    .distinct()
                    .collect(Collectors.toList());
        }

        if (targetEmails.isEmpty()) {
            log.info("No target emails found for announcement email: {}", announcement.getId());
            return;
        }

        // 이메일 발송
        for (String email : targetEmails) {
            try {
                // 프로퍼티/환경변수(app.frontend.url)에서 주입받은 도메인 주소 사용
                emailService.sendAnnouncementNotificationEmail(email, announcement, frontendUrl);
            } catch (Exception e) {
                log.error("Failed to send announcement email to: {}", email, e);
            }
        }

        announcement.setEmailSent(true);
        announcement.setEmailSentAt(java.time.LocalDateTime.now());
        announcementRepository.save(announcement);
    }

    /**
     * 공지 수신자 추가를 위한 활성 사용자 검색 (이름, 회사명, 부서명, 계정명, 이메일)
     */
    @Transactional(readOnly = true)
    public List<UserRecipientDto> searchRecipients(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        org.springframework.data.domain.Pageable limit = org.springframework.data.domain.PageRequest.of(0, 30);
        return userRepository.searchActiveRecipients(keyword.trim(), limit).stream()
                .map(UserRecipientDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 공지 수신 대상 사용자 조회 로직 공통화
     */
    public List<User> resolveTargetUsers(String targetType, String targetCategory, String targetManufacturer, String targetDepartments) {
        String type = targetType != null ? targetType : "ALL";

        if ("ALL".equalsIgnoreCase(type)) {
            return userRepository.findByEnabledTrueAndEmailIsNotNull().stream()
                    .filter(u -> !u.getEmail().trim().isEmpty())
                    .collect(Collectors.toList());
        } else if ("CATEGORY".equalsIgnoreCase(type)) {
            List<String> targetCompanies = (targetCategory != null && !targetCategory.isEmpty())
                    ? manufacturerRepository.findByCategory(targetCategory).stream().map(Manufacturer::getName).filter(Objects::nonNull).toList()
                    : Collections.emptyList();
            return targetCompanies.isEmpty() ? Collections.emptyList() :
                    userRepository.findByEnabledTrueAndEmailIsNotNullAndCompanyNameIn(targetCompanies).stream()
                            .filter(u -> u.getRole() != null && u.getRole().contains("ROLE_MANUFACTURER"))
                            .filter(u -> !u.getEmail().trim().isEmpty())
                            .collect(Collectors.toList());
        } else if ("MANUFACTURER".equalsIgnoreCase(type)) {
            List<User> mfrUsers = (targetManufacturer != null && !targetManufacturer.isEmpty())
                    ? userRepository.findByEnabledTrueAndEmailIsNotNullAndCompanyName(targetManufacturer)
                    : Collections.emptyList();
            return mfrUsers.stream()
                    .filter(u -> u.getRole() != null && u.getRole().contains("ROLE_MANUFACTURER"))
                    .filter(u -> !u.getEmail().trim().isEmpty())
                    .filter(u -> {
                        if (targetDepartments == null || targetDepartments.trim().isEmpty()) {
                            return true; // 부서 미지정 시 회사 소속 전체 발송
                        }
                        List<String> deptList = Arrays.stream(targetDepartments.split(","))
                                .map(String::trim)
                                .collect(Collectors.toList());
                        return u.getDepartment() != null && deptList.contains(u.getDepartment().trim());
                    })
                    .collect(Collectors.toList());
        } else {
            // 하위 호환성 카테고리 매칭
            List<String> targetCompanies = manufacturerRepository.findByCategory(type).stream()
                    .map(Manufacturer::getName).filter(Objects::nonNull).toList();
            return targetCompanies.isEmpty() ? Collections.emptyList() :
                    userRepository.findByEnabledTrueAndEmailIsNotNullAndCompanyNameIn(targetCompanies).stream()
                            .filter(u -> u.getRole() != null && u.getRole().contains("ROLE_MANUFACTURER"))
                            .filter(u -> !u.getEmail().trim().isEmpty())
                            .collect(Collectors.toList());
        }
    }

    /**
     * 특정 공지의 실제 수신 대상자 리스트 조회
     */
    @Transactional(readOnly = true)
    public List<UserRecipientDto> getRecipientsForAnnouncement(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found with id: " + id));

        return resolveTargetUsers(
                announcement.getTargetType(),
                announcement.getTargetCategory(),
                announcement.getTargetManufacturer(),
                announcement.getTargetDepartments()
        ).stream()
         .map(UserRecipientDto::fromEntity)
         .collect(Collectors.toList());
    }

    /**
     * 작성/수정 중인 공지 초안(Draft)의 수신 대상자 리스트 실시간 미리보기
     */
    @Transactional(readOnly = true)
    public List<UserRecipientDto> getPreviewRecipients(Announcement draft) {
        if (draft == null) return Collections.emptyList();

        return resolveTargetUsers(
                draft.getTargetType(),
                draft.getTargetCategory(),
                draft.getTargetManufacturer(),
                draft.getTargetDepartments()
        ).stream()
         .map(UserRecipientDto::fromEntity)
         .collect(Collectors.toList());
    }
}
