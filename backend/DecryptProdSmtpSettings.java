import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class DecryptProdSmtpSettings {
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;
    private static final String secretKeyString = "qms_local_dev_key_16";

    public static void main(String[] args) throws Exception {
        // Local properties sync config for Supabase (production target)
        String url = "jdbc:postgresql://aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require";
        String user = "postgres.ruhghbmvjkfwdjdnlhgl";
        String password = "iWbWvErt0dguGOHF";

        Class.forName("org.postgresql.Driver");

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("=== Querying system_settings ===");
            ResultSet rs = stmt.executeQuery("SELECT setting_key, setting_value FROM system_settings");
            while (rs.next()) {
                String key = rs.getString("setting_key");
                String value = rs.getString("setting_value");
                if ("SMTP_HOST".equals(key) || "SMTP_PORT".equals(key) || "SMTP_USERNAME".equals(key)) {
                    System.out.println(key + ": " + value);
                } else if ("SMTP_PASSWORD".equals(key)) {
                    try {
                        String decrypted = decrypt(value);
                        System.out.println(key + ": " + decrypted);
                    } catch (Exception e) {
                        System.out.println(key + " (Encryption failed to decrypt): " + value);
                    }
                }
            }
        }
    }

    public static String decrypt(String combinedText) {
        if (combinedText == null || combinedText.isEmpty()) return combinedText;
        try {
            byte[] combined = Base64.getDecoder().decode(combinedText);
            
            if (combined.length < IV_LENGTH_BYTE) {
                return decryptLegacy(combinedText);
            }

            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[IV_LENGTH_BYTE];
            buffer.get(iv);

            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), spec);

            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return decryptLegacy(combinedText);
        }
    }

    private static String decryptLegacy(String encryptedText) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey());
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return encryptedText; 
        }
    }

    private static SecretKeySpec getSecretKey() {
        byte[] keyBytes = secretKeyString.getBytes(StandardCharsets.UTF_8);
        byte[] finalKey = new byte[16];
        System.arraycopy(keyBytes, 0, finalKey, 0, Math.min(keyBytes.length, 16));
        return new SecretKeySpec(finalKey, "AES");
    }
}
