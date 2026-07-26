package com.example.ims.controller;

import com.example.ims.entity.ChannelNoteCategory;
import com.example.ims.entity.ChannelSpecialNote;
import com.example.ims.entity.SalesChannel;
import com.example.ims.repository.ChannelNoteCategoryRepository;
import com.example.ims.repository.ChannelSpecialNoteRepository;
import com.example.ims.repository.SalesChannelRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ChannelNoteConfigController {

    private final ChannelNoteCategoryRepository categoryRepository;
    private final ChannelSpecialNoteRepository noteRepository;
    private final SalesChannelRepository channelRepository;

    private static final String UPLOAD_DIR = "uploads/channel_stickers/";

    /**
     * 카테고리 항목 목록 조회 (활성만 or 전체)
     */
    @GetMapping("/channel-note-categories")
    public ResponseEntity<?> getCategories(@RequestParam(required = false, defaultValue = "false") boolean all) {
        if (all) {
            return ResponseEntity.ok(categoryRepository.findAllByOrderByDisplayOrderAsc());
        }
        return ResponseEntity.ok(categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc());
    }

    /**
     * 카테고리 항목 생성 (관리자/품질팀)
     */
    @PostMapping("/channel-note-categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<?> createCategory(@RequestBody ChannelNoteCategory category) {
        if (category.getCategoryKey() == null || category.getCategoryKey().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"카테고리 Key는 필수입니다.\"}");
        }
        if (category.getCategoryLabel() == null || category.getCategoryLabel().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"카테고리 라벨은 필수입니다.\"}");
        }

        if (categoryRepository.findByCategoryKey(category.getCategoryKey().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("{\"message\": \"이미 존재하는 카테고리 Key입니다.\"}");
        }

        if (category.getDisplayOrder() == null) {
            category.setDisplayOrder(categoryRepository.findAll().size() + 1);
        }
        category.setIsActive(true);

        ChannelNoteCategory saved = categoryRepository.save(category);
        return ResponseEntity.ok(saved);
    }

    /**
     * 카테고리 항목 수정 및 순서/비활성화 변경 (관리자/품질팀)
     */
    @PutMapping("/channel-note-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody ChannelNoteCategory updated) {
        ChannelNoteCategory category = categoryRepository.findById(id).orElse(null);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }

        if (updated.getCategoryLabel() != null) category.setCategoryLabel(updated.getCategoryLabel().trim());
        if (updated.getDisplayOrder() != null) category.setDisplayOrder(updated.getDisplayOrder());
        if (updated.getIsActive() != null) category.setIsActive(updated.getIsActive());

        ChannelNoteCategory saved = categoryRepository.save(category);
        return ResponseEntity.ok(saved);
    }

    /**
     * 채널 스티커 이미지/PDF 파일 업로드 API
     */
    @PostMapping("/sales-channels/upload-sticker-file")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<?> uploadStickerFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"업로드할 파일이 없습니다.\"}");
        }

        try {
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }

            String savedName = UUID.randomUUID().toString() + ext;
            Path filePath = Paths.get(UPLOAD_DIR + savedName);
            Files.write(filePath, file.getBytes());

            String fileUrl = "/uploads/channel_stickers/" + savedName;
            String fileType = ext.toLowerCase().contains("pdf") ? "PDF" : "IMAGE";

            return ResponseEntity.ok(Map.of(
                    "fileUrl", fileUrl,
                    "fileType", fileType,
                    "fileName", originalName != null ? originalName : savedName
            ));
        } catch (IOException e) {
            log.error("스티커 파일 업로드 실패:", e);
            return ResponseEntity.internalServerError().body("{\"message\": \"파일 업로드 실패\"}");
        }
    }

    /**
     * 특정 유통 채널의 항목별 특이사항 목록 조회
     */
    @GetMapping("/sales-channels/{channelId}/special-notes")
    public ResponseEntity<?> getChannelSpecialNotes(@PathVariable Long channelId) {
        SalesChannel channel = channelRepository.findById(channelId).orElse(null);
        if (channel == null) {
            return ResponseEntity.notFound().build();
        }

        List<ChannelNoteCategory> activeCategories = categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        List<ChannelSpecialNote> existingNotes = noteRepository.findByChannelId(channelId);

        Map<Long, ChannelSpecialNote> noteMap = existingNotes.stream()
                .collect(Collectors.toMap(n -> n.getCategory().getId(), n -> n));

        List<Map<String, Object>> result = activeCategories.stream().map(cat -> {
            Map<String, Object> item = new HashMap<>();
            item.put("categoryId", cat.getId());
            item.put("categoryKey", cat.getCategoryKey());
            item.put("categoryLabel", cat.getCategoryLabel());
            item.put("displayOrder", cat.getDisplayOrder());

            ChannelSpecialNote note = noteMap.get(cat.getId());
            if (note != null) {
                item.put("noteContent", note.getNoteContent() != null ? note.getNoteContent() : "");
                item.put("fileUrl", note.getFileUrl());
                item.put("fileType", note.getFileType());
                item.put("expiryOption", note.getExpiryOption());
                item.put("customExpiryFormat", note.getCustomExpiryFormat());
            } else {
                item.put("noteContent", "");
                item.put("fileUrl", null);
                item.put("fileType", null);
                item.put("expiryOption", null);
                item.put("customExpiryFormat", null);
            }

            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "channelId", channelId,
                "legacySpecialNotes", channel.getSpecialNotes() != null ? channel.getSpecialNotes() : "",
                "notes", result
        ));
    }

    /**
     * 특정 유통 채널의 항목별 특이사항 저장
     */
    @PostMapping("/sales-channels/{channelId}/special-notes")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
    public ResponseEntity<?> saveChannelSpecialNotes(
            @PathVariable Long channelId,
            @RequestBody List<NoteSavePayload> payloads,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        SalesChannel channel = channelRepository.findById(channelId).orElse(null);
        if (channel == null) {
            return ResponseEntity.notFound().build();
        }

        String username = userDetails != null ? userDetails.getUsername() : "SYSTEM";

        for (NoteSavePayload payload : payloads) {
            if (payload.getCategoryId() == null) continue;
            ChannelNoteCategory category = categoryRepository.findById(payload.getCategoryId()).orElse(null);
            if (category == null) continue;

            Optional<ChannelSpecialNote> existingOpt = noteRepository.findByChannelIdAndCategoryId(channelId, payload.getCategoryId());
            if (existingOpt.isPresent()) {
                ChannelSpecialNote note = existingOpt.get();
                note.setNoteContent(payload.getNoteContent() != null ? payload.getNoteContent().trim() : "");
                note.setFileUrl(payload.getFileUrl());
                note.setFileType(payload.getFileType());
                note.setExpiryOption(payload.getExpiryOption());
                note.setCustomExpiryFormat(payload.getCustomExpiryFormat());
                note.setUpdatedBy(username);
                noteRepository.save(note);
            } else {
                ChannelSpecialNote note = ChannelSpecialNote.builder()
                        .channel(channel)
                        .category(category)
                        .noteContent(payload.getNoteContent() != null ? payload.getNoteContent().trim() : "")
                        .fileUrl(payload.getFileUrl())
                        .fileType(payload.getFileType())
                        .expiryOption(payload.getExpiryOption())
                        .customExpiryFormat(payload.getCustomExpiryFormat())
                        .updatedBy(username)
                        .build();
                noteRepository.save(note);
            }
        }

        return ResponseEntity.ok().body("{\"message\": \"채널 포장 특이사항이 성공적으로 저장되었습니다.\"}");
    }

    @Data
    public static class NoteSavePayload {
        private Long categoryId;
        private String noteContent;
        private String fileUrl;
        private String fileType;
        private String expiryOption;
        private String customExpiryFormat;
    }
}
