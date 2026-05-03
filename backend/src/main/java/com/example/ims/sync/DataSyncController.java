package com.example.ims.sync;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/system")
@RequiredArgsConstructor
@Slf4j
public class DataSyncController {

    private final DataSyncDownService syncService;

    @PostMapping("/sync-down")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> syncDown() {
        try {
            syncService.syncDownAll();
            return ResponseEntity.ok(Map.of("message", "Data sync from Supabase to H2 completed successfully."));
        } catch (Exception e) {
            log.error("Sync-down API failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/list-tables")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listTables() {
        List<String> h2Tables = syncService.getH2Tables();
        List<String> supabaseTables = syncService.getSupabaseTables();
        return ResponseEntity.ok(Map.of("h2", h2Tables, "supabase", supabaseTables));
    }
}
