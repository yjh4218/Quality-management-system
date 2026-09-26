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
    public void testSendFailure500ServerError() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError().body("Internal Server Error"));

        MailSendException exception = assertThrows(MailSendException.class, () -> {
            resendEmailSender.send("recipient@userdomain.com", "Test Subject", "<h1>Hello World</h1>");
        });

        assertTrue(exception.getMessage().contains("Resend API error status=500"));
        mockServer.verify();
    }
}
