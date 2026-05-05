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
 * [SECURITY UPGRADE] AES-GCM 인증 암호화 (IV 사용)
 * 1. AES/ECB -> AES/GCM/NoPadding (무결성 검증 포함)
 * 2. 매 암호화마다 SecureRandom으로 12바이트 IV 생성
 * 3. 키 길이 검증 및 초기화 차단 (16자 미만 금지)
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
            log.error("[CRITICAL] Encryption secret key is missing or too short! Minimum 16 characters required.");
            throw new IllegalStateException("암호화 키가 설정되지 않았거나 너무 짧습니다. (최소 16자)");
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
            
            // 데이터 길이 확인 (최소 IV 길이)
            if (combined.length < IV_LENGTH_BYTE) {
                log.warn("Encrypted data too short. Checking legacy format...");
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
            log.error("Decryption failed. Attempting legacy recovery...", e);
            return decryptLegacy(combinedText);
        }
    }

    /**
     * [마이그레이션] 이전 ECB 암호화 데이터를 위한 폴백 메서드
     */
    private String decryptLegacy(String encryptedText) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey());
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            // 복호화가 완전히 불가능한 경우 원본 반환
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
