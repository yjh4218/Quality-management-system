package com.example.ims.controller;

import com.example.ims.entity.MailTemplate;
import com.example.ims.service.MailTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-templates")
@RequiredArgsConstructor
public class MailTemplateController {

    private final MailTemplateService mailTemplateService;

    @GetMapping
    public ResponseEntity<List<MailTemplate>> getAllTemplates() {
        return ResponseEntity.ok(mailTemplateService.getAllTemplates());
    }

    @GetMapping("/active")
    public ResponseEntity<List<MailTemplate>> getActiveTemplates(@RequestParam(required = false) String category) {
        if (category != null) {
            return ResponseEntity.ok(mailTemplateService.getActiveTemplatesByCategory(category));
        }
        return ResponseEntity.ok(mailTemplateService.getAllTemplates().stream().filter(MailTemplate::getActive).toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<MailTemplate> createTemplate(@RequestBody MailTemplate template) {
        return ResponseEntity.ok(mailTemplateService.saveTemplate(template));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<MailTemplate> updateTemplate(@PathVariable Long id, @RequestBody MailTemplate template) {
        template.setId(id);
        return ResponseEntity.ok(mailTemplateService.saveTemplate(template));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','QUALITY','QUALITY_TEAM')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        mailTemplateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
