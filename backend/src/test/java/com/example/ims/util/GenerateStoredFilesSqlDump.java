package com.example.ims.util;

import org.junit.jupiter.api.Test;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Stream;

public class GenerateStoredFilesSqlDump {

    private static final String UPLOADS_DIR = "uploads";

    @Test
    public void generateSql() throws Exception {
        Path uploadsPath = Paths.get(UPLOADS_DIR).toAbsolutePath().normalize();
        if (!Files.exists(uploadsPath)) {
            // Try relative from project root
            uploadsPath = Paths.get("backend/uploads").toAbsolutePath().normalize();
        }
        System.out.println("Scanning uploads at: " + uploadsPath);
        if (!Files.exists(uploadsPath)) {
            System.err.println("Uploads directory not found!");
            return;
        }

        List<Path> allFiles = new ArrayList<>();
        try (Stream<Path> stream = Files.walk(uploadsPath)) {
            stream.filter(Files::isRegularFile)
                  .filter(p -> !p.toString().contains("isolated"))
                  .forEach(allFiles::add);
        }

        System.out.println("Total files found: " + allFiles.size());

        // 1. Urgent Set: The exact 18 files from the user's error log
        Set<String> urgentKeywords = Set.of(
            "3b9a0c0d", "c6a8e174", "020294c4", "33802b82",
            "pkg_3d_outbox", "pkg_3d_inbox", "pkg_3d_pallet",
            "aded7832", "0187f12f", "cb98951e", "790765c9",
            "aff16114", "934ea745", "e96f9aeb", "d25f1f91",
            "d4b786a5", "5befa843", "0f0cc398"
        );

        List<Path> urgentFiles = new ArrayList<>();
        for (Path file : allFiles) {
            String name = file.getFileName().toString();
            for (String kw : urgentKeywords) {
                if (name.contains(kw)) {
                    urgentFiles.add(file);
                    break;
                }
            }
        }

        System.out.println("Urgent 404 files matched: " + urgentFiles.size());
        writeSqlChunk(uploadsPath, urgentFiles, new File("supabase_restore_urgent_images.sql"), "Urgent Fix: 404 Missing Images in Production");

        // 2. Chunk all files into <= 8MB binary chunks (approx 16MB SQL text) for smooth paste in Supabase
        long maxChunkBytes = 8 * 1024 * 1024L; // 8MB
        List<Path> currentChunk = new ArrayList<>();
        long currentChunkSize = 0;
        int partIndex = 1;

        for (Path file : allFiles) {
            long size = Files.size(file);
            if (currentChunkSize + size > maxChunkBytes && !currentChunk.isEmpty()) {
                writeSqlChunk(uploadsPath, currentChunk, new File("supabase_stored_files_part" + partIndex + ".sql"), "Part " + partIndex);
                partIndex++;
                currentChunk.clear();
                currentChunkSize = 0;
            }
            currentChunk.add(file);
            currentChunkSize += size;
        }

        if (!currentChunk.isEmpty()) {
            writeSqlChunk(uploadsPath, currentChunk, new File("supabase_stored_files_part" + partIndex + ".sql"), "Part " + partIndex);
        }

        // 3. Consolidated file
        writeSqlChunk(uploadsPath, allFiles, new File("supabase_stored_files_all.sql"), "All Uploaded Files Backup");
    }

    private void writeSqlChunk(Path baseDir, List<Path> files, File outputFile, String title) throws Exception {
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outputFile), StandardCharsets.UTF_8))) {
            writer.println("-- ========================================================");
            writer.println("-- QMS Stored Files Backup for Supabase PostgreSQL");
            writer.println("-- Target Table: stored_files");
            writer.println("-- Title: " + title);
            writer.println("-- File Count: " + files.size());
            writer.println("-- Generated: " + new Date());
            writer.println("-- ========================================================");
            writer.println();
            writer.println("SET session_replication_role = 'replica';");
            writer.println();

            long totalBytes = 0;
            int count = 0;

            for (Path path : files) {
                Path rel = baseDir.relativize(path);
                String relPathStr = rel.toString().replace('\\', '/');
                String fileName = path.getFileName().toString();
                long size = Files.size(path);
                totalBytes += size;

                byte[] data = Files.readAllBytes(path);
                String contentType = probeContentType(fileName);
                String hexData = bytesToHex(data);

                String escapedPath = relPathStr.replace("'", "''");
                String escapedFileName = fileName.replace("'", "''");

                writer.printf(
                    "INSERT INTO stored_files (file_path, file_name, content_type, file_size, file_data, created_at, updated_at)%n" +
                    "VALUES ('%s', '%s', '%s', %d, '\\x%s'::bytea, NOW(), NOW())%n" +
                    "ON CONFLICT (file_path) DO UPDATE SET file_data = EXCLUDED.file_data, file_size = EXCLUDED.file_size, updated_at = NOW();%n%n",
                    escapedPath, escapedFileName, contentType, size, hexData
                );
                count++;
            }

            writer.println("SET session_replication_role = 'origin';");
            writer.println();
            writer.printf("-- Successfully generated %d files (Total raw binary size: %.2f MB)%n", 
                count, (totalBytes / (1024.0 * 1024.0)));
            
            System.out.printf("Exported %s: %d files, SQL size: %.2f MB (Binary: %.2f MB)%n",
                outputFile.getName(), count, (outputFile.length() / (1024.0 * 1024.0)), (totalBytes / (1024.0 * 1024.0)));
        }
    }

    private String probeContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        return "application/octet-stream";
    }

    private static final char[] HEX_ARRAY = "0123456789abcdef".toCharArray();

    private String bytesToHex(byte[] bytes) {
        char[] hexChars = new char[bytes.length * 2];
        for (int j = 0; j < bytes.length; j++) {
            int v = bytes[j] & 0xFF;
            hexChars[j * 2] = HEX_ARRAY[v >>> 4];
            hexChars[j * 2 + 1] = HEX_ARRAY[v & 0x0F];
        }
        return new String(hexChars);
    }
}
