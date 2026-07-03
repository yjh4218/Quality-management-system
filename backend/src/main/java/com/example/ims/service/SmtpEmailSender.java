package com.example.ims.service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
@Profile("!prod")
@RequiredArgsConstructor
@Slf4j
public class SmtpEmailSender implements EmailSender {

    private final SystemSettingService systemSettingService;

    @PostConstruct
    public void init() {
        log.info("[MAIL INIT] Active mail sender: SmtpEmailSender (SMTP Mode)");
    }

    @Override
    public boolean isConfigured() {
        String host = systemSettingService.getSettingValue(SystemSettingService.SMTP_HOST);
        return host != null && !host.trim().isEmpty();
    }

    @Override
    public void send(String to, String subject, String body) throws Exception {
        JavaMailSenderImpl mailSender = getMailSender();
        String fromEmail = systemSettingService.getSettingValue(SystemSettingService.SMTP_USERNAME);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail, "QMS 품질관리팀");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(body, true);

        mailSender.send(message);
    }

    private JavaMailSenderImpl getMailSender() {
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
        props.put("mail.debug", "false");

        if (mailSender.getPort() == 465) {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.socketFactory.port", "465");
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            props.put("mail.smtp.socketFactory.fallback", "false");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
        }

        return mailSender;
    }
}
