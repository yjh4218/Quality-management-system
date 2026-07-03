package com.example.ims.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
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
    private String resendApiKey;

    @Value("${resend.api.url:https://api.resend.com/emails}")
    private String resendApiUrl;

    @Value("${resend.from.address:}")
    private String fromAddress;

    @Value("${resend.from.name:QMS System}")
    private String fromName;

    private final RestTemplate restTemplate;

    public ResendEmailSender() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); // 3 seconds Connection Timeout
        factory.setReadTimeout(5000);    // 5 seconds Response Timeout
        this.restTemplate = new RestTemplate(factory);
    }

    // Constructor for testing injects RestTemplate directly
    public ResendEmailSender(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        if (resendApiKey == null || resendApiKey.trim().isEmpty()) {
            log.error("[MAIL INIT ERROR] RESEND_API_KEY is not configured in production profile!");
            throw new IllegalStateException("Production deployment requires RESEND_API_KEY environment variable.");
        }
        if (fromAddress == null || fromAddress.trim().isEmpty()) {
            log.error("[MAIL INIT ERROR] RESEND_FROM_ADDRESS is not configured in production profile!");
            throw new IllegalStateException("Production deployment requires RESEND_FROM_ADDRESS environment variable.");
        }
        log.info("[MAIL INIT] Active mail sender: ResendEmailSender (API Mode)");
    }

    @Override
    public boolean isConfigured() {
        return resendApiKey != null && !resendApiKey.trim().isEmpty();
    }

    @Override
    public void send(String to, String subject, String body) throws Exception {
        try {
            HttpHeaders headers = new HttpHeaders();
            // Secure header setup - Bearer token
            headers.set("Authorization", "Bearer " + resendApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("from", fromName + " <" + fromAddress + ">");
            payload.put("to", List.of(to));
            payload.put("subject", subject);
            
            // ✅ HTML content field explicit mapping as requested
            payload.put("html", body);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(resendApiUrl, request, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new MailSendException("Resend API returned non-2xx status code: " + response.getStatusCode());
            }
            log.info("[MAIL] Resend sent email successfully to={}", to);
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            HttpStatusCode statusCode = e.getStatusCode();
            
            // 🔒 Security: Do NOT log request headers (Authorization token is kept hidden)
            log.error("[MAIL ERROR] Resend REST API failed. Status: {}, Body: {}", statusCode, responseBody);

            if (statusCode.value() == 403 || responseBody.contains("not authenticated") || responseBody.contains("validation_error") || responseBody.contains("restricted")) {
                log.error("[DIAGNOSIS] Resend 발신 도메인이 아직 인증되지 않았습니다. Resend 대시보드(https://resend.com)에서 도메인(qms-test.kro.kr) CNAME/TXT DNS 인증 상태를 확인해 주세요.");
            }
            throw new MailSendException("Resend API error status=" + statusCode + ", body=" + responseBody, e);
        } catch (Exception e) {
            log.error("[MAIL ERROR] Error calling Resend API: {}", e.getMessage());
            throw new MailSendException("Failed sending email via Resend API", e);
        }
    }
}
