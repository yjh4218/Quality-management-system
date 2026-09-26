package com.example.ims.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@Profile("prod")
@Slf4j
public class ResendEmailSender implements EmailSender {

    @Value("${resend.api.key:}")
    private String envResendApiKey;

    @Value("${resend.api.url:https://api.resend.com/emails}")
    private String resendApiUrl;

    @Value("${resend.from.address:}")
    private String envFromAddress;

    @Value("${resend.from.name:QMS System}")
    private String fromName;

    private final RestTemplate restTemplate;

    private SystemSettingService systemSettingService;

    public ResendEmailSender() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    public ResendEmailSender(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public ResendEmailSender(RestTemplate restTemplate, SystemSettingService systemSettingService) {
        this.restTemplate = restTemplate;
        this.systemSettingService = systemSettingService;
    }

    @Autowired(required = false)
    public void setSystemSettingService(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    @PostConstruct
    public void init() {
        String activeKey = resolveApiKey();
        if (activeKey == null || activeKey.isEmpty()) {
            log.warn("[MAIL INIT] RESEND_API_KEY is not configured yet. It can be dynamically configured in System Settings UI.");
        } else {
            String masked = activeKey.length() > 6 
                    ? activeKey.substring(0, Math.min(4, activeKey.length())) + "..." + activeKey.substring(activeKey.length() - 2) 
                    : "***";
            log.info("[MAIL INIT] Active mail sender: ResendEmailSender (API Mode, ActiveKey={})", masked);
        }
    }

    public String resolveApiKey() {
        if (systemSettingService != null) {
            String dbPass = systemSettingService.getSmtpPassword();
            if (dbPass != null && !dbPass.trim().isEmpty()) {
                return cleanValue(dbPass);
            }
            String dbResendKey = systemSettingService.getSettingValue("RESEND_API_KEY");
            if (dbResendKey != null && !dbResendKey.trim().isEmpty()) {
                return cleanValue(dbResendKey);
            }
        }
        if (envResendApiKey != null && !envResendApiKey.trim().isEmpty()) {
            return cleanValue(envResendApiKey);
        }
        return null;
    }

    public String resolveFromAddress() {
        if (systemSettingService != null) {
            String dbFrom = systemSettingService.getSettingValue(SystemSettingService.SMTP_FROM_ADDRESS);
            if (dbFrom != null && !dbFrom.trim().isEmpty()) {
                return cleanValue(dbFrom);
            }
            String dbResendFrom = systemSettingService.getSettingValue("RESEND_FROM_ADDRESS");
            if (dbResendFrom != null && !dbResendFrom.trim().isEmpty()) {
                return cleanValue(dbResendFrom);
            }
        }
        if (envFromAddress != null && !envFromAddress.trim().isEmpty()) {
            return cleanValue(envFromAddress);
        }
        return "onboarding@resend.dev";
    }

    private String cleanValue(String val) {
        if (val == null) return null;
        String cleaned = val.trim();
        if ((cleaned.startsWith("\"") && cleaned.endsWith("\"")) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.substring(1, cleaned.length() - 1).trim();
        }
        return cleaned;
    }

    @Override
    public boolean isConfigured() {
        String key = resolveApiKey();
        return key != null && !key.isEmpty();
    }

    @Override
    public void send(String to, String subject, String body) throws Exception {
        if (to == null || to.trim().isEmpty()) {
            log.warn("[MAIL] Recipient email is empty. Skipping send.");
            return;
        }

        String recipient = to.trim();
        if (recipient.endsWith("@example.com") || recipient.endsWith("@test.com") || recipient.contains("example.com")) {
            log.info("[MAIL SKIP] 더미 도메인 수신자({}) 대상 메일 발송 스킵 (Subject: {})", recipient, subject);
            return;
        }

        String apiKey = resolveApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            throw new MailSendException("Resend API Key가 설정되어 있지 않습니다. [사용자 승인 관리 > 시스템 설정]에서 're_'로 시작하는 Resend API Key를 입력하고 저장해 주세요.");
        }

        String fromAddr = resolveFromAddress();
        String formattedFrom = fromAddr.contains("<") ? fromAddr : (fromName + " <" + fromAddr + ">");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("from", formattedFrom);
            payload.put("to", List.of(recipient));
            payload.put("subject", subject);
            payload.put("html", body);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(resendApiUrl, request, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new MailSendException("Resend API returned non-2xx status code: " + response.getStatusCode());
            }
            log.info("[MAIL] Resend sent email successfully to={}", recipient);
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            HttpStatusCode statusCode = e.getStatusCode();
            log.error("[MAIL ERROR] Resend REST API failed. Status: {}, Body: {}", statusCode, responseBody);

            if (statusCode.value() == 401) {
                throw new MailSendException("Resend API Key 인증 실패 (401 Unauthorized): 등록된 API Key가 유효하지 않거나 만료되었습니다. [시스템 설정]에서 Resend 대시보드(resend.com/api-keys)에서 발급받은 're_'로 시작하는 유효한 API Key를 다시 입력하고 저장해 주세요.", e);
            } else if (statusCode.value() == 403 || responseBody.contains("not authenticated") || responseBody.contains("validation_error") || responseBody.contains("restricted")) {
                throw new MailSendException("Resend 발신 권한/도메인 제한 (403 Forbidden): Resend 무료 기본 발신자(onboarding@resend.dev)는 Resend 계정 가입 시 등록한 본인 이메일로만 발송이 허용됩니다. 다른 주소로 발송하시려면 Resend 대시보드에서 도메인 인증을 완료해 주십시오. (세부: " + responseBody + ")", e);
            }
            throw new MailSendException("Resend API error status=" + statusCode + ", body=" + responseBody, e);
        } catch (Exception e) {
            log.error("[MAIL ERROR] Error calling Resend API: {}", e.getMessage());
            throw new MailSendException(e.getMessage(), e);
        }
    }
}
