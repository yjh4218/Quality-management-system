package com.example.ims.service;

public interface EmailSender {
    void send(String to, String subject, String body) throws Exception;
    boolean isConfigured();
}
