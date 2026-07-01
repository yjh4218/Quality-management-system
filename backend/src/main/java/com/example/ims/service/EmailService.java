package com.example.ims.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import com.example.ims.entity.Announcement;

import java.util.Properties;

import com.example.ims.repository.BugReportRepository;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final SystemSettingService systemSettingService;
    private final BugReportRepository bugReportRepository;
    private final NotificationService notificationService;
    private final org.springframework.core.task.AsyncTaskExecutor mailExecutor;

    public void sendEmailAsync(JavaMailSenderImpl mailSender, MimeMessage message, String toEmail, String subject) {
        mailExecutor.execute(() -> {
            try {
                mailSender.send(message);
                log.info("Asynchronous email sent successfully to: {}", toEmail);
            } catch (Exception e) {
                handleMailFailure(toEmail, subject, e);
            }
        });
    }

    private void handleMailFailure(String toEmail, String mailSubject, Exception e) {
        log.error("[MAIL ERROR] Failed to send email to: {}, Subject: {}", toEmail, mailSubject, e);

        // 1. 버그 리포트 등록 (DB 직접 입력으로 CORS 우회)
        try {
            com.example.ims.entity.BugReport bug = com.example.ims.entity.BugReport.builder()
                    .description("[시스템 자동 감지 - 메일 전송 실패]")
                    .steps(String.format("메일 발송에 실패했습니다. (이메일: %s)\n제목: %s\n\n[예외 내용]\n%s", 
                            toEmail, mailSubject, e.toString()))
                    .screenName("QMS 메일 발송기 (EmailService)")
                    .url("EmailService.java")
                    .severity("CRITICAL")
                    .serverError(e.getMessage() != null ? e.getMessage() : e.toString())
                    .build();
            bugReportRepository.save(bug);
            log.info("BugReport generated directly for mail failure: to={}", toEmail);
        } catch (Exception bugErr) {
            log.error("Failed to create BugReport for mail failure", bugErr);
        }

        // 2. 실시간 알림 등록
        try {
            org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;

            if (currentUsername != null && !"anonymousUser".equals(currentUsername)) {
                notificationService.createNotification(
                        "이메일 발송 실패 알림",
                        String.format("수신자 %s 대상 메일('%s') 발송에 실패했습니다. 잠시 후 다시 시도해 주십시오.", toEmail, mailSubject),
                        "EMAIL_FAILURE",
                        currentUsername,
                        null,
                        null,
                        null
                );
            }
        } catch (Exception notifErr) {
            log.error("Failed to create User Notification for mail failure", notifErr);
        }
    }

    public JavaMailSenderImpl getMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();

        String host = systemSettingService.getSettingValue(SystemSettingService.SMTP_HOST);
        String portStr = systemSettingService.getSettingValue(SystemSettingService.SMTP_PORT);
        String username = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);
        String password = systemSettingService.getSmtpPassword();

        if (host == null || host.trim().isEmpty()) {
            throw new RuntimeException("이메일 발송 서버(SMTP Host)가 구성되어 있지 않습니다. [사용자 관리 및 승인] 화면 하단 시스템 설정에서 SMTP 서버 주소 및 포트를 정확히 등록해 주세요.");
        }

        mailSender.setHost(host);
        
        try {
            mailSender.setPort(Integer.parseInt(portStr));
        } catch (NumberFormatException e) {
            mailSender.setPort(587); // Default to 587
        }

        mailSender.setUsername(username);
        mailSender.setPassword(password);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");

        return mailSender;
    }

    public boolean isSmtpConfigured() {
        String host = systemSettingService.getSettingValue(SystemSettingService.SMTP_HOST);
        return host != null && !host.trim().isEmpty();
    }

    @org.springframework.scheduling.annotation.Async("mailExecutor")
    public void sendVerificationEmail(String toEmail, String token, String baseUrl) {
        String verifyUrl = baseUrl + "/verify-email?token=" + token;
        if (!isSmtpConfigured()) {
            log.info("==== [MOCK VERIFICATION EMAIL SEND] ====");
            log.info("To: {}", toEmail);
            log.info("Verify Link: {}", verifyUrl);
            log.info("=========================================");
            return;
        }
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 시스템 관리자");
            helper.setTo(toEmail);
            helper.setSubject("[QMS 시스템] 계정 인증을 완료해주세요.");

            String content = "<html><body>" +
                    "<h2>통합 품질 관리 시스템 (QMS)</h2>" +
                    "<p>안녕하세요, 가입해주셔서 감사합니다.</p>" +
                    "<p>아래 링크를 클릭하여 이메일 인증을 완료하시면 관리자 승인 절차가 진행됩니다.</p>" +
                    "<p><a href=\"" + verifyUrl + "\" style=\"display: inline-block; padding: 10px 20px; color: white; background-color: #003366; text-decoration: none; border-radius: 5px;\">이메일 인증하기</a></p>" +
                    "<p>링크가 동작하지 않는다면 아래 주소를 복사하여 브라우저에 붙여넣어주세요.</p>" +
                    "<p>" + verifyUrl + "</p>" +
                    "</body></html>";

            helper.setText(content, true);
            
            mailSender.send(message);
            log.info("Verification email sent to: {}", toEmail);
            
        } catch (Exception e) {
            handleMailFailure(toEmail, "[QMS 시스템] 계정 인증을 완료해주세요.", e);
        }
    }

    @org.springframework.scheduling.annotation.Async("mailExecutor")
    public void sendClaimNotificationEmail(String toEmail, com.example.ims.entity.Claim claim) {
        if (!isSmtpConfigured()) {
            log.info("==== [MOCK CLAIM NOTIFICATION SEND] ====");
            log.info("To: {}", toEmail);
            log.info("Claim Number: {}", claim.getClaimNumber());
            log.info("=========================================");
            return;
        }
        String prodName = claim.getProductName() != null ? claim.getProductName() : "제품";
        String subject = "[QMS 시스템] 클레임 접수 안내 (" + prodName + ")";
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 품질관리팀");
            helper.setTo(toEmail);
            
            java.time.LocalDate deadline = java.time.LocalDate.now().plusDays(7);
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy.MM.dd");
            String replyDeadline = deadline.format(formatter);
            helper.setSubject("[QMS 시스템] 클레임 접수 안내 (" + prodName + ") - " + replyDeadline + "까지 회신");

            String content = "<html>\n<body style=\"font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;\">\n" +
                    "  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">\n" +
                    "    <h2 style=\"color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;\">통합 품질 관리 시스템 (QMS)</h2>\n" +
                    "    <p>안녕하세요, 귀사에 <b>클레임 접수 및 원인 분석 요청</b>이 접수되어 안내 드립니다.</p>\n" +
                    "    <div style=\"background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n" +
                    "      <ul style=\"margin: 0; padding-left: 20px; color: #475569;\">\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>클레임 번호:</b> " + (claim.getClaimNumber() != null ? claim.getClaimNumber() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>품목 코드:</b> " + (claim.getItemCode() != null ? claim.getItemCode() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>제품명:</b> " + (claim.getProductName() != null ? claim.getProductName() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>LOT 번호:</b> " + (claim.getLotNumber() != null ? claim.getLotNumber() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>발생 수량:</b> " + (claim.getOccurrenceQty() != null ? claim.getOccurrenceQty().toString() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>내용:</b> " + (claim.getClaimContent() != null ? claim.getClaimContent() : "") + "</li>\n" +
                    "      </ul>\n" +
                    "    </div>\n" +
                    "    <p>자세한 사항은 QMS 시스템에 접속하여 해당 클레임에 대한 원인 분석 및 재발 방지 대책을 작성하여 제출해 주시기 바랍니다.</p>\n" +
                    "    <div style=\"text-align: center; margin: 30px 0;\">\n" +
                    "      <a href=\"http://localhost:5173/?claimId=" + claim.getId() + "&amp;fromEmail=true\" style=\"display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 6px; font-weight: bold;\">상세 클레임 확인하기</a>\n" +
                    "    </div>\n" +
                    "    <hr style=\"border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;\" />\n" +
                    "    <p style=\"font-size: 12px; color: #94a3b8; text-align: center;\">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>\n" +
                    "  </div>\n" +
                    "</body>\n" +
                    "</html>";

            helper.setText(content, true);

            sendEmailAsync(mailSender, message, toEmail, subject);

        } catch (Exception e) {
            handleMailFailure(toEmail, subject, e);
        }
    }

    @org.springframework.scheduling.annotation.Async("mailExecutor")
    public void sendProductionAuditNotificationEmail(String toEmail, com.example.ims.entity.Product product) {
        if (!isSmtpConfigured()) {
            log.info("==== [MOCK AUDIT NOTIFICATION SEND] ====");
            log.info("To: {}", toEmail);
            log.info("Product: {}", product.getProductName());
            log.info("=========================================");
            return;
        }
        String subject = "[QMS 시스템] 신제품 생산감리 사진 등록 요청 (" + product.getProductName() + ")";
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 품질관리팀");
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String content = "<html>\n<body style=\"font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;\">\n" +
                    "  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">\n" +
                    "    <h2 style=\"color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;\">통합 품질 관리 시스템 (QMS)</h2>\n" +
                    "    <p>안녕하세요, 귀사에 <b>신제품 생산감리 사진 등록</b>이 요청되었습니다.</p>\n" +
                    "    <div style=\"background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n" +
                    "      <ul style=\"margin: 0; padding-left: 20px; color: #475569;\">\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>품목코드:</b> " + (product.getItemCode() != null ? product.getItemCode() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>제품명:</b> " + (product.getProductName() != null ? product.getProductName() : "") + "</li>\n" +
                    "      </ul>\n" +
                    "    </div>\n" +
                    "    <p>QMS 시스템에 접속하여 해당 제품에 대한 용기, 단상자, 적재 사진을 업로드해 주시기 바랍니다.</p>\n" +
                    "    <div style=\"text-align: center; margin: 30px 0;\">\n" +
                    "      <a href=\"http://localhost:5173/?itemCode=" + (product.getItemCode() != null ? java.net.URLEncoder.encode(product.getItemCode(), "UTF-8") : "") + "\" style=\"display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #003366; text-decoration: none; border-radius: 6px; font-weight: bold;\">📸 생산감리 사진 등록하러 가기</a>\n" +
                    "    </div>\n" +
                    "    <hr style=\"border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;\" />\n" +
                    "    <p style=\"font-size: 12px; color: #94a3b8; text-align: center;\">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>\n" +
                    "  </div>\n" +
                    "</body>\n" +
                    "</html>";

            helper.setText(content, true);

            sendEmailAsync(mailSender, message, toEmail, subject);

        } catch (Exception e) {
            handleMailFailure(toEmail, subject, e);
        }
    }

    public void sendAnnouncementNotificationEmail(String toEmail, Announcement announcement, String baseUrl) {
        String categoryName = announcement.getCategory() != null ? announcement.getCategory().getName() : "일반";
        if (!isSmtpConfigured()) {
            log.info("==== [MOCK ANNOUNCEMENT EMAIL SEND] ====");
            log.info("To: {}", toEmail);
            log.info("Announcement ID: {}, Title: {}", announcement.getId(), announcement.getTitle());
            log.info("=========================================");
            return;
        }
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 시스템 관리자");
            helper.setTo(toEmail);
            helper.setSubject("[QMS 시스템] 전체공지 (" + categoryName + ") - " + announcement.getTitle());

            String systemUrl = baseUrl != null ? baseUrl : "http://localhost:5173";
            String content = "<html>\n<body style=\"font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;\">\n" +
                    "  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">\n" +
                    "    <h2 style=\"color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;\">통합 품질 관리 시스템 (QMS) 전체공지</h2>\n" +
                    "    <p>시스템에 새로운 전체공지사항이 등록되었습니다.</p>\n" +
                    "    <div style=\"background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;\">\n" +
                    "      <ul style=\"margin: 0; padding-left: 20px; color: #475569;\">\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>공지 분류:</b> " + categoryName + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>공지 번호:</b> " + (announcement.getAnnouncementNumber() != null ? announcement.getAnnouncementNumber() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>공지 제목:</b> " + (announcement.getTitle() != null ? announcement.getTitle() : "") + "</li>\n" +
                    "        <li style=\"margin-bottom: 8px;\"><b>작성자:</b> " + (announcement.getCreatedByName() != null ? announcement.getCreatedByName() : "") + "</li>\n" +
                    "      </ul>\n" +
                    "      <div style=\"margin-top: 15px; border-top: 1px dashed #cbd5e1; padding-top: 15px; color: #1e293b;\">\n" +
                    "        " + (announcement.getContent() != null ? announcement.getContent().replace("\n", "<br/>") : "") + "\n" +
                    "      </div>\n" +
                    "    </div>\n" +
                    "    <div style=\"text-align: center; margin: 30px 0;\">\n" +
                    "      <a href=\"" + systemUrl + "\" style=\"display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #0f172a; text-decoration: none; border-radius: 6px; font-weight: bold;\">QMS 시스템 바로가기</a>\n" +
                    "    </div>\n" +
                    "    <hr style=\"border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;\" />\n" +
                    "    <p style=\"font-size: 12px; color: #94a3b8; text-align: center;\">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>\n" +
                    "  </div>\n" +
                    "</body>\n" +
                    "</html>";

            helper.setText(content, true);

            sendEmailAsync(mailSender, message, toEmail, "[QMS 시스템] 전체공지 - " + announcement.getTitle());

        } catch (Exception e) {
            handleMailFailure(toEmail, "[QMS 시스템] 전체공지 - " + announcement.getTitle(), e);
        }
    }

    @org.springframework.scheduling.annotation.Async("mailExecutor")
    public void sendDynamicEmail(String toEmail, com.example.ims.entity.MailTemplate template, com.example.ims.entity.Claim claim) {
        String content = processClaimTemplate(template.getBody(), claim);
        String subject = processClaimTemplate(template.getSubject(), claim);

        if (!isSmtpConfigured()) {
            log.info("==== [MOCK DYNAMIC EMAIL SEND] ====");
            log.info("To: {}", toEmail);
            log.info("Subject: {}", subject);
            log.info("Body: {}", content);
            log.info("====================================");
            try {
                java.io.File dir = new java.io.File("mock_emails");
                if (!dir.exists()) dir.mkdirs();
                String safeSubject = subject.replaceAll("[\\\\/:*?\"<>|]", "_");
                java.io.File file = new java.io.File(dir, "email_" + System.currentTimeMillis() + "_" + safeSubject + ".html");
                java.nio.file.Files.writeString(file.toPath(), "To: " + toEmail + "\nSubject: " + subject + "\n\n" + content);
                log.info("Mock email saved to: {}", file.getAbsolutePath());
            } catch (Exception ex) {
                log.error("Failed to write mock email to file", ex);
            }
            return;
        }
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 품질관리팀");
            helper.setTo(toEmail);
            
            if (!subject.startsWith("[QMS 시스템]")) {
                subject = "[QMS 시스템] " + subject;
            }
            helper.setSubject(subject);
            helper.setText(content, true);

            sendEmailAsync(mailSender, message, toEmail, subject);
            
        } catch (Exception e) {
            handleMailFailure(toEmail, subject, e);
        }
    }

    public boolean sendCustomEmail(String toEmail, String subject, String body) {
        String htmlBody = body;
        if (htmlBody != null) {
            String lowerBody = htmlBody.trim().toLowerCase();
            if (!lowerBody.startsWith("<html>") && !lowerBody.startsWith("<!doctype")) {
                // Convert newlines to HTML line breaks
                htmlBody = htmlBody.replace("\r\n", "<br/>").replace("\n", "<br/>");
                // Auto-link URLs that are not already inside href attribute
                htmlBody = htmlBody.replaceAll("(?<!href=\")https?://[a-zA-Z0-9./?=&_~#%+-]+", "<a href=\"$0\" style=\"color: #4f46e5; text-decoration: underline; font-weight: bold;\">$0</a>");
                // Wrap in unified QMS email system template container
                htmlBody = "<html>\n<body style=\"font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333;\">\n" +
                        "  <div style=\"max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">\n" +
                        "    <h2 style=\"color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;\">통합 품질 관리 시스템 (QMS)</h2>\n" +
                        "    <div style=\"margin: 20px 0; color: #334155;\">\n" +
                        "      " + htmlBody + "\n" +
                        "    </div>\n" +
                        "    <hr style=\"border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;\" />\n" +
                        "    <p style=\"font-size: 12px; color: #94a3b8; text-align: center;\">본 메일은 QMS 시스템에서 자동으로 발송된 메일입니다.</p>\n" +
                        "  </div>\n" +
                        "</body>\n" +
                        "</html>";
            }
        }

        if (!isSmtpConfigured()) {
            log.info("==== [MOCK CUSTOM EMAIL SEND] ====");
            log.info("To: {}", toEmail);
            log.info("Subject: {}", subject);
            log.info("Body: {}", htmlBody);
            log.info("===================================");
            try {
                java.io.File dir = new java.io.File("mock_emails");
                if (!dir.exists()) dir.mkdirs();
                String safeSubject = subject.replaceAll("[\\\\/:*?\"<>|]", "_");
                java.io.File file = new java.io.File(dir, "email_" + System.currentTimeMillis() + "_" + safeSubject + ".html");
                java.nio.file.Files.writeString(file.toPath(), "To: " + toEmail + "\nSubject: " + subject + "\n\n" + htmlBody);
                log.info("Mock email saved to: {}", file.getAbsolutePath());
            } catch (Exception ex) {
                log.error("Failed to write mock email to file", ex);
            }
            return true;
        }
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 품질관리팀");
            helper.setTo(toEmail);
            if (!subject.startsWith("[QMS 시스템]")) {
                subject = "[QMS 시스템] " + subject;
            }
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            sendEmailAsync(mailSender, message, toEmail, subject);
            return false;
        } catch (Exception e) {
            handleMailFailure(toEmail, subject, e);
            return false;
        }
    }
    public String processClaimTemplate(String content, com.example.ims.entity.Claim claim) {
        if (content == null || claim == null) return content;
        
        // Build photos html
        StringBuilder photosHtml = new StringBuilder();
        if (claim.getClaimPhotos() != null && !claim.getClaimPhotos().isEmpty()) {
            for (String photoUrl : claim.getClaimPhotos()) {
                String fullUrl = photoUrl;
                if (photoUrl.startsWith("/")) {
                    fullUrl = "http://localhost:8080" + photoUrl;
                }
                photosHtml.append("<div><img src=\"").append(fullUrl).append("\" style=\"max-width:400px; margin:8px 0; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);\" /></div>");
            }
        } else {
            photosHtml.append("<p style=\"color: #94a3b8; font-style: italic;\">첨부된 사진이 없습니다.</p>");
        }

        // Build claim detail link
        String claimLinkUrl = "http://localhost:5173/?claimId=" + claim.getId() + "&fromEmail=true";
        String linkHtml = "<a href=\"" + claimLinkUrl + "\" style=\"display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); margin: 15px 0;\">🔍 클레임 상세 내용 확인하기</a>";

        // Calculate reply deadline (발송일 + 7일)
        java.time.LocalDate deadline = java.time.LocalDate.now().plusDays(7);
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy.MM.dd");
        String replyDeadline = deadline.format(formatter);

        return content.replace("${claimNumber}", claim.getClaimNumber() != null ? claim.getClaimNumber() : "")
                     .replace("${itemCode}", claim.getItemCode() != null ? claim.getItemCode() : "")
                     .replace("${productName}", claim.getProductName() != null ? claim.getProductName() : "")
                     .replace("${lotNumber}", claim.getLotNumber() != null ? claim.getLotNumber() : "")
                     .replace("${occurrenceQty}", claim.getOccurrenceQty() != null ? claim.getOccurrenceQty().toString() : "")
                     .replace("${claimContent}", claim.getClaimContent() != null ? claim.getClaimContent() : "")
                     .replace("${claimPhotos}", photosHtml.toString())
                     .replace("${claimLink}", linkHtml)
                     .replace("${replyDeadline}", replyDeadline);
    }

    public String processAuditTemplate(String content, com.example.ims.entity.ProductionAudit audit) {
        if (content == null || audit == null) return content;

        String auditLinkUrl;
        if (audit.getId() != null) {
            auditLinkUrl = "http://localhost:5173/?auditId=" + audit.getId();
        } else {
            try {
                auditLinkUrl = "http://localhost:5173/?itemCode=" + java.net.URLEncoder.encode(audit.getItemCode() != null ? audit.getItemCode() : "", "UTF-8");
            } catch (Exception e) {
                auditLinkUrl = "http://localhost:5173/?itemCode=" + audit.getItemCode();
            }
        }
        String linkHtml = "<a href=\"" + auditLinkUrl + "\" style=\"display: inline-block; padding: 12px 24px; color: #ffffff; background-color: #003366; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0;\">📸 생산감리 사진 등록하러 가기</a>";

        return content.replace("${itemCode}", audit.getItemCode() != null ? audit.getItemCode() : "")
                     .replace("${productName}", audit.getProductName() != null ? audit.getProductName() : "")
                     .replace("${auditLink}", linkHtml)
                     .replace("${productionAuditLink}", linkHtml);
    }
}
