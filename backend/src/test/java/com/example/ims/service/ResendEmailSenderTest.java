package com.example.ims.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import java.lang.reflect.Field;

public class ResendEmailSenderTest {

    private ResendEmailSender resendEmailSender;
    private MockRestServiceServer mockServer;
    private RestTemplate restTemplate;
    private SystemSettingService systemSettingService;

    @BeforeEach
    public void setUp() throws Exception {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.createServer(restTemplate);
        systemSettingService = mock(SystemSettingService.class);
        resendEmailSender = new ResendEmailSender(restTemplate, systemSettingService);

        // Reflection to inject mock/test variables
        setField(resendEmailSender, "envResendApiKey", "re_test_key");
        setField(resendEmailSender, "resendApiUrl", "https://api.resend.com/emails");
        setField(resendEmailSender, "envFromAddress", "noreply@qms-test.kro.kr");
        setField(resendEmailSender, "fromName", "QMS System");
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    @Test
    public void testSendSuccessWithEnvKey() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer re_test_key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.from").value("QMS System <noreply@qms-test.kro.kr>"))
                .andExpect(jsonPath("$.to[0]").value("recipient@userdomain.com"))
                .andExpect(jsonPath("$.subject").value("Test Subject"))
                .andExpect(jsonPath("$.html").value("<h1>Hello World</h1>"))
                .andRespond(withSuccess("{\"id\": \"123\"}", MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> {
            resendEmailSender.send("recipient@userdomain.com", "Test Subject", "<h1>Hello World</h1>");
        });

        mockServer.verify();
    }

    @Test
    public void testSendSuccessWithDbSettingsPriority() {
        when(systemSettingService.getSmtpPassword()).thenReturn("re_db_dynamic_key");
        when(systemSettingService.getSettingValue(SystemSettingService.SMTP_FROM_ADDRESS)).thenReturn("admin@company.com");

        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer re_db_dynamic_key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.from").value("QMS System <admin@company.com>"))
                .andExpect(jsonPath("$.to[0]").value("user@target.com"))
                .andRespond(withSuccess("{\"id\": \"456\"}", MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> {
            resendEmailSender.send("user@target.com", "Test Subject", "<h1>Hello</h1>");
        });

        mockServer.verify();
    }

    @Test
    public void testSkipDummyEmail() {
        // 더미 이메일(example.com)은 외부 호출 없이 스킵되어야 함
        assertDoesNotThrow(() -> {
            resendEmailSender.send("kolmar@example.com", "Test Subject", "<h1>Hello</h1>");
        });

        // mockServer에 요청이 오지 않았으므로 verify 성공
        mockServer.verify();
    }

    @Test
    public void testSendFailure401Unauthorized() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .body("{\"message\": \"API key invalid\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        MailSendException exception = assertThrows(MailSendException.class, () -> {
            resendEmailSender.send("recipient@userdomain.com", "Test Subject", "<h1>Hello World</h1>");
        });

        assertTrue(exception.getMessage().contains("401 Unauthorized"));
        mockServer.verify();
    }

    @Test
    public void testSendFailure403Forbidden() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .body("{\"message\": \"Domain not authenticated\", \"error\": \"validation_error\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        MailSendException exception = assertThrows(MailSendException.class, () -> {
            resendEmailSender.send("recipient@userdomain.com", "Test Subject", "<h1>Hello World</h1>");
        });

        assertTrue(exception.getMessage().contains("403 Forbidden"));
        mockServer.verify();
    }

    @Test
    public void testSendFallbackWhenSandboxRestricted() {
        // 첫 번째 전송: 403 Forbidden과 함께 계정 본인 이메일 안내 반환
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.to[0]").value("recipient@userdomain.com"))
                .andRespond(withStatus(HttpStatus.FORBIDDEN)
                        .body("{\"message\":\"You can only send testing emails to your own email address (tester@gmail.com). To send emails to other recipients, please verify a domain.\",\"name\":\"validation_error\",\"statusCode\":403}")
                        .contentType(MediaType.APPLICATION_JSON));

        // 두 번째 전송 (자동 Fallback): tester@gmail.com으로 전달 발송
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.to[0]").value("tester@gmail.com"))
                .andExpect(jsonPath("$.subject").value("[전달 -> recipient@userdomain.com] Test Subject"))
                .andRespond(withSuccess("{\"id\": \"fallback-999\"}", MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> {
            resendEmailSender.send("recipient@userdomain.com", "Test Subject", "<h1>Test Body</h1>");
        });

        assertEquals("tester@gmail.com", resendEmailSender.getCachedSandboxEmail());
        mockServer.verify();
    }

    @Test
    public void testSendAutoRedirectWhenSandboxEmailCached() throws Exception {
        setField(resendEmailSender, "envFromAddress", "onboarding@resend.dev");
        resendEmailSender.setCachedSandboxEmail("tester@gmail.com");

        // 캐시된 샌드박스 이메일이 있을 때는 403 유발 없이 곧바로 tester@gmail.com으로 전달 발송
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.to[0]").value("tester@gmail.com"))
                .andExpect(jsonPath("$.subject").value("[전달 -> newuser@otherdomain.com] Urgent Notice"))
                .andRespond(withSuccess("{\"id\": \"cached-redirect-1\"}", MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> {
            resendEmailSender.send("newuser@otherdomain.com", "Urgent Notice", "<p>Hello</p>");
        });

        mockServer.verify();
    }
}
