package com.example.ims.controller;

import com.example.ims.dto.ApiResponse;
import com.example.ims.entity.ManufacturerInviteToken;
import com.example.ims.service.ManufacturerInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/manufacturers")
@RequiredArgsConstructor
public class ManufacturerInviteController {

    private final ManufacturerInviteService inviteService;

    @PostMapping("/{id}/invite")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createInvite(
            @PathVariable Long id,
            Authentication authentication) {
        String createdBy = authentication != null ? authentication.getName() : "system";
        ManufacturerInviteToken inviteToken = inviteService.createInviteToken(id, createdBy);

        Map<String, Object> result = Map.of(
            "token", inviteToken.getToken(),
            "manufacturerId", inviteToken.getManufacturer().getId(),
            "manufacturerName", inviteToken.getManufacturer().getName(),
            "expiresAt", inviteToken.getExpiresAt(),
            "inviteUrl", "/register/invite/" + inviteToken.getToken()
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/invite/{token}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateInviteToken(@PathVariable String token) {
        try {
            ManufacturerInviteToken inviteToken = inviteService.validateToken(token);
            Map<String, Object> result = Map.of(
                "valid", true,
                "manufacturerId", inviteToken.getManufacturer().getId(),
                "manufacturerName", inviteToken.getManufacturer().getName(),
                "expiresAt", inviteToken.getExpiresAt()
            );
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
