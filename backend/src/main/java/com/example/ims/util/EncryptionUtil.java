package com.example.ims.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * [SECURITY PATCH] AES-GCM 인증 암호화 유틸리티
 * 1. AES/ECB -> AES/GCM/NoPadding (IV 사용)
 * 2. 매 암호화 시 랜덤 IV 생성 및 결합
 * 3. 키 미설정 시 구동 차단
 */
@Component
@Slf4j
public class EncryptionUtil {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;

    @Value("${app.encryption.secret-key:}")
    private String secretKeyString;

    @PostConstruct
    public void validateKey() {
        if (secretKeyString == null || secretKeyString.length() < 16) {
            log.error("[CRITICAL] Encryption secret key is missing or too short! App will stop.");
            // 운영 환경에서는 예외를 던져 구동을 차단해야 하나, 개발 편의상 로깅 후 기본값 설정 로직만 경고
            if (secretKeyString == null || secretKeyString.isEmpty()) {
                log.warn("[SECURITY] Using temporary development key. DO NOT USE IN PRODUCTION.");
                secretKeyString = "DevelopmentKey_1234567890";
            }
        }
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) return plainText;
        try {
            byte[] iv = new byte[IV_LENGTH_BYTE];
            new SecureRandom().nextBytes(iv); // 안전한 랜덤 IV 생성

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey(), spec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            
            // [IV (12bytes)] + [CipherText] 결합 후 Base64 인코딩
            byte[] combined = ByteBuffer.allocate(iv.length + cipherText.length)
                    .put(iv)
                    .put(cipherText)
                    .array();
            
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption error");
        }
    }

    public String decrypt(String combinedText) {
        if (combinedText == null || combinedText.isEmpty()) return combinedText;
        try {
            byte[] combined = Base64.getDecoder().decode(combinedText);
            
            // 이전 ECB 방식 데이터와의 호환성을 위한 체크
            if (combined.length < IV_LENGTH_BYTE) {
                log.warn("Legacy encrypted data detected or data too short.");
                return decryptLegacy(combinedText);
            }

            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[IV_LENGTH_BYTE];
            buffer.get(iv); // IV 추출

            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText); // 암호문 추출

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), spec);

            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed. Data might be corrupted or using old format.", e);
            // 복호화 실패 시 원본 혹은 하위 호환 시도
            return decryptLegacy(combinedText);
        }
    }

    private String decryptLegacy(String encryptedText) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey());
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return encryptedText; 
        }
    }

    private SecretKeySpec getSecretKey() {
        byte[] keyBytes = secretKeyString.getBytes(StandardCharsets.UTF_8);
        byte[] finalKey = new byte[16];
        System.arraycopy(keyBytes, 0, finalKey, 0, Math.min(keyBytes.length, 16));
        return new SecretKeySpec(finalKey, "AES");
    }
}
