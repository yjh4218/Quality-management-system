package com.example.ims.controller;

import com.example.ims.entity.MailTemplate;
import com.example.ims.service.MailTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mail-templates")
@CrossOrigin(origins = "*")
public class MailTemplateController {

    @Autowired
    private MailTemplateService mailTemplateService;

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
    public ResponseEntity<MailTemplate> createTemplate(@RequestBody MailTemplate template) {
        return ResponseEntity.ok(mailTemplateService.saveTemplate(template));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MailTemplate> updateTemplate(@PathVariable Long id, @RequestBody MailTemplate template) {
        template.setId(id);
        return ResponseEntity.ok(mailTemplateService.saveTemplate(template));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        mailTemplateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
