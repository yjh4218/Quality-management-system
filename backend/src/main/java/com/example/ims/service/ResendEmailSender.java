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

    @Value("${resend.from.address:${app.mail.from:onboarding@resend.dev}}")
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
        return envFromAddress != null ? cleanValue(envFromAddress) : "onboarding@resend.dev";
    }

    private String cleanValue(String val) {
        if (val == null) return null;
        String cleaned = val.trim();
        if ((cleaned.startsWith("\"") && cleaned.endsWith("\"")) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.substring(1, cleaned.length() - 1).trim();
        }
        return cleaned;
    }

    private static final java.util.regex.Pattern RESEND_SANDBOX_EMAIL_PATTERN = 
            java.util.regex.Pattern.compile("own email address \\(([^)]+)\\)");

    // 무료 샌드박스에서 자동 감지된 등록 계정 이메일 (예: yjh0950@gmail.com)
    private volatile String cachedSandboxEmail = null;

    public String getCachedSandboxEmail() {
        return cachedSandboxEmail;
    }

    public void setCachedSandboxEmail(String cachedSandboxEmail) {
        this.cachedSandboxEmail = cachedSandboxEmail;
    }

    @Override
    public boolean isConfigured() {
        String key = resolveApiKey();
        return key != null && !key.isEmpty();
    }

    private void executePost(String apiKey, String formattedFrom, String to, String subject, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = new HashMap<>();
        payload.put("from", formattedFrom);
        payload.put("to", List.of(to));
        payload.put("subject", subject);
        payload.put("html", body);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(resendApiUrl, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new MailSendException("Resend API returned non-2xx status code: " + response.getStatusCode());
        }
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

        // 만약 이전에 감지된 샌드박스 허용 이메일이 있고, 무료 기본 발신자(resend.dev)인 경우:
        // 외부 수신자 대상 403 API 오류를 사전에 방지하기 위해 등록된 테스트 계정으로 자동 전달 발송
        String targetEmail = recipient;
        String targetSubject = subject;
        boolean isSandboxRedirect = false;

        if (cachedSandboxEmail != null && fromAddr.contains("resend.dev") && !recipient.equalsIgnoreCase(cachedSandboxEmail)) {
            targetEmail = cachedSandboxEmail;
            targetSubject = "[전달 -> " + recipient + "] " + subject;
            isSandboxRedirect = true;
            log.info("[MAIL SANDBOX AUTO-REDIRECT] Resend 무료 플랜 제한으로 원래 수신자({}) 대신 검증된 계정({})으로 자동 전달 발송합니다.", recipient, cachedSandboxEmail);
        }

        try {
            executePost(apiKey, formattedFrom, targetEmail, targetSubject, body);
            if (isSandboxRedirect) {
                log.info("[MAIL] Resend sent email successfully via sandbox redirect to={} (original: {})", targetEmail, recipient);
            } else {
                log.info("[MAIL] Resend sent email successfully to={}", recipient);
            }
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            HttpStatusCode statusCode = e.getStatusCode();

            // 403 Forbidden 및 "You can only send testing emails to your own email address (xxx)" 감지 시
            if (statusCode.value() == 403 || responseBody.contains("own email address")) {
                java.util.regex.Matcher matcher = RESEND_SANDBOX_EMAIL_PATTERN.matcher(responseBody);
                if (matcher.find()) {
                    String detectedSandboxEmail = matcher.group(1).trim();
                    if (!detectedSandboxEmail.isEmpty() && !detectedSandboxEmail.equalsIgnoreCase(recipient)) {
                        this.cachedSandboxEmail = detectedSandboxEmail;
                        log.warn("[MAIL FALLBACK] Resend 무료 샌드박스 정책 감지됨: 외부 도메인({}) 발송 차단. 계정 인증 이메일({})로 자동 전달 발송을 1회 재시도합니다.", recipient, detectedSandboxEmail);
                        try {
                            String fallbackSubject = "[전달 -> " + recipient + "] " + subject;
                            executePost(apiKey, formattedFrom, detectedSandboxEmail, fallbackSubject, body);
                            log.info("[MAIL SUCCESS] Resend 샌드박스 전달 발송 성공: to={} (원래 수신자: {})", detectedSandboxEmail, recipient);
                            return;
                        } catch (Exception retryEx) {
                            log.warn("[MAIL FALLBACK FAILED] Resend 샌드박스 전달 발송 재시도 실패: {}", retryEx.getMessage());
                        }
                    }
                }
                log.warn("[MAIL WARN] Resend 무료 계정 발신 제한 (403 Forbidden): 외부 수신자({}) 전송 제한됨.", recipient);
                throw new MailSendException("Resend 발신 권한/도메인 제한 (403 Forbidden): Resend 무료 기본 발신자(onboarding@resend.dev)는 Resend 계정 가입 시 등록한 본인 이메일로만 발송이 허용됩니다. 다른 주소로 발송하시려면 Resend 대시보드에서 도메인 인증을 완료해 주십시오. (세부: " + responseBody + ")", e);
            }

            log.error("[MAIL ERROR] Resend REST API failed. Status: {}, Body: {}", statusCode, responseBody);
            if (statusCode.value() == 401) {
                throw new MailSendException("Resend API Key 인증 실패 (401 Unauthorized): 등록된 API Key가 유효하지 않거나 만료되었습니다. [시스템 설정]에서 Resend 대시보드(resend.com/api-keys)에서 발급받은 're_'로 시작하는 유효한 API Key를 다시 입력하고 저장해 주세요.", e);
            }
            throw new MailSendException("Resend API error status=" + statusCode + ", body=" + responseBody, e);
        } catch (Exception e) {
            log.error("[MAIL ERROR] Error calling Resend API: {}", e.getMessage());
            throw new MailSendException(e.getMessage(), e);
        }
    }
}
