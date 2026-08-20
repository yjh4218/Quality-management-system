package com.example.ims.service;

import com.example.ims.entity.MailTemplate;
import com.example.ims.repository.MailTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MailTemplateService {

    private final MailTemplateRepository mailTemplateRepository;

    public void initDefaultTemplates() {
        java.util.Optional<MailTemplate> existingClaimDefault = mailTemplateRepository.findByTemplateCodeAndDeletedFalse("CLAIM_DEFAULT");
        if (existingClaimDefault.isEmpty()) {
            MailTemplate claimTemplate = MailTemplate.builder()
                    .templateCode("CLAIM_DEFAULT")
                    .templateName("기본 클레임 안내 메일")
                    .subject("${productName} 클레임 접수_${replyDeadline}까지 회신")
                    .category("CLAIM")
                    .active(true)
                    .deleted(false)
                    .body("<p>안녕하세요, 제조사 담당자님.</p>" +
                          "<p>아래와 같이 클레임이 접수되었습니다. 확인 후 원인 분석 및 재발 방지 대책 회신을 부탁드립니다.</p>" +
                          "<ul>" +
                          "<li><strong>클레임번호:</strong> ${claimNumber}</li>" +
                          "<li><strong>품목코드:</strong> ${itemCode}</li>" +
                          "<li><strong>제품명:</strong> ${productName}</li>" +
                          "<li><strong>LOT번호:</strong> ${lotNumber}</li>" +
                          "<li><strong>발생수량:</strong> ${occurrenceQty}</li>" +
                          "<li><strong>클레임 내용:</strong> ${claimContent}</li>" +
                          "</ul>" +
                          "<p>QMS 시스템에 접속하여 상세 내역을 확인해 주시기 바랍니다.</p>" +
                          "<div style=\"text-align: center;\">${claimLink}</div>" +
                          "<p>감사합니다.</p>")
                    .build();
            mailTemplateRepository.save(claimTemplate);
        } else {
            // 마이그레이션 로직
            MailTemplate template = existingClaimDefault.get();
            boolean updated = false;
            if ("[품질관리] 클레임 접수 및 원인 분석 요청 안내".equals(template.getSubject())) {
                template.setSubject("${productName} 클레임 접수_${replyDeadline}까지 회신");
                updated = true;
            }
            if (!template.getBody().contains("${claimLink}")) {
                template.setBody(template.getBody().replace("<p>감사합니다.</p>", "<div style=\"text-align: center;\">${claimLink}</div><p>감사합니다.</p>"));
                updated = true;
            }
            if (updated) {
                mailTemplateRepository.save(template);
            }
        }
        if (mailTemplateRepository.findByTemplateCodeAndDeletedFalse("AUDIT_DEFAULT").isEmpty()) {
            MailTemplate auditTemplate = MailTemplate.builder()
                    .templateCode("AUDIT_DEFAULT")
                    .templateName("기본 생산감리 사진 등록 요청 메일")
                    .subject("[QMS 알림] 신제품 생산감리 사진 등록 요청 (${productName})")
                    .category("PRODUCTION_AUDIT")
                    .active(true)
                    .deleted(false)
                    .body("<html>\n" +
                          "<body style=\"font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;\">\n" +
                          "  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">\n" +
                          "    <h2 style=\"color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;\">통합 품질 관리 시스템 (QMS)</h2>\n" +
                          "    <p>안녕하세요, 귀사에 <b>신제품 생산감리 사진 등록</b>이 요청되었습니다.</p>\n" +
                          "    <div style=\"background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n" +
                          "      <ul style=\"margin: 0; padding-left: 20px; color: #475569;\">\n" +
                          "        <li style=\"margin-bottom: 8px;\"><b>품목코드:</b> ${itemCode}</li>\n" +
                          "        <li style=\"margin-bottom: 8px;\"><b>제품명:</b> ${productName}</li>\n" +
                          "      </ul>\n" +
                          "    </div>\n" +
                          "    <p>QMS 시스템에 접속하여 해당 제품에 대한 용기, 단상자, 적재 사진을 업로드해 주시기 바랍니다.</p>\n" +
                          "    <div style=\"text-align: center; margin: 30px 0;\">\n" +
                          "      ${productionAuditLink}\n" +
                          "    </div>\n" +
                          "    <hr style=\"border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;\" />\n" +
                          "    <p style=\"font-size: 12px; color: #94a3b8; text-align: center;\">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>\n" +
                          "  </div>\n" +
                          "</body>\n" +
                          "</html>")
                    .build();
            mailTemplateRepository.save(auditTemplate);
        }
    }

    public List<MailTemplate> getAllTemplates() {
        return mailTemplateRepository.findByDeletedFalseOrderByUpdatedAtDesc();
    }

    public List<MailTemplate> getActiveTemplatesByCategory(String category) {
        return mailTemplateRepository.findByCategoryAndDeletedFalseAndActiveTrue(category);
    }

    public MailTemplate getTemplateByCode(String templateCode) {
        return mailTemplateRepository.findByTemplateCodeAndDeletedFalse(templateCode)
                .orElse(null);
    }

    @Transactional
    public MailTemplate saveTemplate(MailTemplate template) {
        if (template.getId() != null) {
            MailTemplate existing = mailTemplateRepository.findById(template.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Template not found"));
            existing.setTemplateName(template.getTemplateName());
            existing.setSubject(template.getSubject());
            existing.setBody(template.getBody());
            existing.setCategory(template.getCategory());
            existing.setActive(template.getActive());
            // templateCode is usually immutable but we can allow update if needed.
            return mailTemplateRepository.save(existing);
        }
        return mailTemplateRepository.save(template);
    }

    @Transactional
    public void deleteTemplate(Long id) {
        MailTemplate template = mailTemplateRepository.findById(id).orElse(null);
        if (template != null) {
            template.setDeleted(true);
            mailTemplateRepository.save(template);
        }
    }
}
