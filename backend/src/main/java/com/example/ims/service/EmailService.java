package com.example.ims.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final SystemSettingService systemSettingService;

    public JavaMailSenderImpl getMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();

        String host = systemSettingService.getSettingValue(SystemSettingService.SMTP_HOST);
        String portStr = systemSettingService.getSettingValue(SystemSettingService.SMTP_PORT);
        String username = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);
        String password = systemSettingService.getSmtpPassword();

        if (host == null || host.isEmpty()) {
            throw new RuntimeException("SMTP Host is not configured.");
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

    public void sendVerificationEmail(String toEmail, String token, String baseUrl) {
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "QMS 시스템 관리자");
            helper.setTo(toEmail);
            helper.setSubject("[QMS] 계정 인증을 완료해주세요.");

            String verifyUrl = baseUrl + "/verify-email?token=" + token;
            String content = "<html><body>" +
                    "<h2>통합 품질 관리 시스템 (QMS)</h2>" +
                    "<p>안녕하세요, 가입해주셔서 감사합니다.</p>" +
                    "<p>아래 링크를 클릭하여 이메일 인증을 완료하시면 관리자 승인 절차가 진행됩니다.</p>" +
                    "<p><a href=\"" + verifyUrl + "\" style=\"display: inline-block; padding: 10px 20px; color: white; background-color: #003366; text-decoration: none; border-radius: 5px;\">이메일 인증하기</a></p>" +
                    "<p>링크가 동작하지 않는다면 아래 주소를 복사하여 브라우저에 붙여넣어주세요.</p>" +
                    "<p>" + verifyUrl + "</p>" +
                    "</body></html>";

            helper.setText(content, true);
            
            // Asynchronous execution recommended in production, but let's keep it synchronous here
            // or we could use @Async if enabled. Since we don't have @EnableAsync, we'll run it in a new Thread.
            new Thread(() -> {
                try {
                    mailSender.send(message);
                    log.info("Verification email sent to: {}", toEmail);
                } catch (Exception e) {
                    log.error("Failed to send async verification email to: {}", toEmail, e);
                }
            }).start();
            
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
            throw new RuntimeException("이메일 발송에 실패했습니다. 관리자에게 설정 확인을 요청하세요.", e);
        }
    }
}
