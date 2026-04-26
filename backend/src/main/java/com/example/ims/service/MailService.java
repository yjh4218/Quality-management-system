package com.example.ims.service;

import org.springframework.stereotype.Service;

@org.springframework.context.annotation.Configuration
@lombok.extern.slf4j.Slf4j
public class MailService {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.mail.javamail.JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:noreply@example.com}")
    private String fromEmail;

    @org.springframework.beans.factory.annotation.Value("${mail.enabled:false}")
    private boolean mailEnabled;

    /**
     * 메일 발송 시 보안을 위해 비밀번호의 앞 2자리만 제외하고 마스킹 처리하여 로그에 남깁니다.
     */
    private String maskPassword(String password) {
        if (password == null || password.length() < 2) return "***";
        return password.substring(0, 2) + "*".repeat(password.length() - 2);
    }

    public void sendApprovalEmail(String toEmail, String name) {
        log.info("[MAIL] Sending Approval Email to: {} (Enabled: {})", toEmail, mailEnabled);
        
        if (mailEnabled && mailSender != null) {
            try {
                org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(toEmail);
                message.setSubject("[TND \uAD00\uB9AC\uC790 \uC2DC\uC2A4\uD15C] \uD68C\uC6D0\uAC00\uC785\uC774 \uC2B9\uC778\uB418\uC5C8\uC2B8\uB2C8\uB2E4.");
                message.setText("\uC548\uD558\uC138\uC694, " + name + "\uB2D8.\n\n" +
                                "\uC2E0\uCCAD\uD558\uC120 \uD68C\uC6D0\uAC00\uC785\uC774 \uAD00\uB9AC\uC790\uC5D0 \uC758\uD574 \uC2B9\uC778\uB418\uC5C8\uC2B8\uB2C8\uB2E4.\n" +
                                "\uC774\uC81C \uC815\uC0C1\uC801\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uC5EC \uC2DC\uC2A4\uD15C\uC744 \uC774\uC6A9\uD558\uC2E4 \uC218 \uC748\uC2B5\uB2C8\uB2E4.\n\n" +
                                "\uAC10\uC0AC\uD569\uB2C8\uB2E4.");
                mailSender.send(message);
            } catch (Exception e) {
                log.error("[MAIL] Failed to send approval email: {}", e.getMessage());
            }
        }
    }

    public void sendTemporaryPassword(String toEmail, String name, String tempPw) {
        // [보안] 로그에는 마스킹된 비밀번호만 출력
        log.info("[MAIL] Sending Temp Password to: {} (PW: {})", toEmail, maskPassword(tempPw));
        
        if (mailEnabled && mailSender != null) {
            try {
                org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(toEmail);
                message.setSubject("[TND \uAD00\uB9AC\uC790 \uC2DC\uC2A4\uD15C] \uC784\uC2DC \uBE44\uBC00\uBC88\uD638 \uC548\uB0B4\uC785\uB2C8\uB2E4.");
                message.setText("\uC548\uD558\uC138\uC694, " + name + "\uB2D8.\n\n" +
                                "\uC694\uCCAD\uD558\uC2E0 \uC784\uC2DC \uBE44\uBC00\uBC88\uD638\uB294 \uB2E4\uC74C\uACAC \uAC19\uC2B5\uB2C8\uB2E4.\n\n" +
                                "\uC784\uC2DC \uBE44\uBC00\uBC88\uD638: " + tempPw + "\n\n" +
                                "\uB85C\uADF8\uC778 \uD6C4 \uBC18\uB4DC\uC2DC \uBE44\uBC00\uBC88\uD638\uB97C \uBC00\uACBD\uD574 \uC8FC\uC138\uC694.\n\n" +
                                "\uAC10\uC0AC\uD569\uB2C8\uB2E4.");
                mailSender.send(message);
            } catch (Exception e) {
                log.error("[MAIL] Failed to send temp password email: {}", e.getMessage());
            }
        }
    }
}
