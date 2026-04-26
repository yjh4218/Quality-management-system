package com.example.ims.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class EncryptionUtil {

    private static final String ALGORITHM = "AES";
    
    // Default 16-byte key for fallback.
    @Value("${app.encryption.secret-key:QmsDefaultKey123}")
    private String secretKeyString;

    private SecretKeySpec getKey() {
        // Ensure the key is exactly 16 bytes for AES-128
        byte[] key = new byte[16];
        byte[] originalKey = secretKeyString.getBytes(StandardCharsets.UTF_8);
        System.arraycopy(originalKey, 0, key, 0, Math.min(originalKey.length, 16));
        return new SecretKeySpec(key, ALGORITHM);
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) return plainText;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, getKey());
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedText) {
        if (encryptedText == null || encryptedText.isEmpty()) return encryptedText;
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, getKey());
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
