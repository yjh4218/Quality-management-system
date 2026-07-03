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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

import java.lang.reflect.Field;

public class ResendEmailSenderTest {

    private ResendEmailSender resendEmailSender;
    private MockRestServiceServer mockServer;
    private RestTemplate restTemplate;

    @BeforeEach
    public void setUp() throws Exception {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.createServer(restTemplate);
        resendEmailSender = new ResendEmailSender(restTemplate);

        // Reflection to inject mock/test variables
        setField(resendEmailSender, "resendApiKey", "re_test_key");
        setField(resendEmailSender, "resendApiUrl", "https://api.resend.com/emails");
        setField(resendEmailSender, "fromAddress", "noreply@qms-test.kro.kr");
        setField(resendEmailSender, "fromName", "QMS System");
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    @Test
    public void testSendSuccess() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer re_test_key"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.from").value("QMS System <noreply@qms-test.kro.kr>"))
                .andExpect(jsonPath("$.to[0]").value("recipient@test.com"))
                .andExpect(jsonPath("$.subject").value("Test Subject"))
                .andExpect(jsonPath("$.html").value("<h1>Hello World</h1>"))
                .andRespond(withSuccess("{\"id\": \"123\"}", MediaType.APPLICATION_JSON));

        assertDoesNotThrow(() -> {
            resendEmailSender.send("recipient@test.com", "Test Subject", "<h1>Hello World</h1>");
        });

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
            resendEmailSender.send("recipient@test.com", "Test Subject", "<h1>Hello World</h1>");
        });

        assertTrue(exception.getMessage().contains("Resend API error status=403"));
        mockServer.verify();
    }

    @Test
    public void testSendFailure500ServerError() {
        mockServer.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError().body("Internal Server Error"));

        MailSendException exception = assertThrows(MailSendException.class, () -> {
            resendEmailSender.send("recipient@test.com", "Test Subject", "<h1>Hello World</h1>");
        });

        assertTrue(exception.getMessage().contains("Resend API error status=500"));
        mockServer.verify();
    }
}
