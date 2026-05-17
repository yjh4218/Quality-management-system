package com.example.ims.controller;

import com.example.ims.dto.ApiResponse;
import com.example.ims.service.ProductIngredientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/quality/ingredients")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'MENU_INGREDIENTCOMPLIANCE_VIEW')")
public class IngredientSafetyController {

    private final ProductIngredientService ingredientService;

    @PostMapping("/analyze")
    public ResponseEntity<ApiResponse<List<ProductIngredientService.IngredientAnalysisResult>>> analyzeIngredients(
            @RequestParam("file") MultipartFile file) {
        try {
            List<ProductIngredientService.IngredientAnalysisResult> results = ingredientService
                    .analyzeIngredientsFromExcel(file);
            return ResponseEntity.ok(ApiResponse.success(results));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("엑셀 파일 처리 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<com.example.ims.entity.RegulatoryIngredient>>> listAllIngredients() {
        try {
            return ResponseEntity.ok(ApiResponse.success(ingredientService.getAllRegulatoryIngredients()));
        } catch (Exception e) {
            log.error("Failed to list ingredients", e);
            throw e;
        }
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'MENU_INGREDIENTCOMPLIANCE_EDIT', 'INGREDIENT_SAFETY_SYNC')")
    public ResponseEntity<ApiResponse<String>> triggerManualSync(
            @RequestParam(value = "countries", defaultValue = "KR,EU,US,CN,JP") String countries) {
        try {
            log.info(">>>> [MANUAL SYNC] Triggered for: {}", countries);
            List<String> countryList = List.of(countries.split(","));
            ingredientService.triggerManualSync(countryList);
            return ResponseEntity.ok(ApiResponse.success("최신 데이터 동기화가 성공적으로 완료되었습니다."));
        } catch (Exception e) {
            log.error("Manual sync failed", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("데이터 동기화 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'MENU_INGREDIENTCOMPLIANCE_EDIT', 'INGREDIENT_SAFETY_SYNC')")
    public ResponseEntity<byte[]> exportToExcel() {
        try {
            byte[] excelContent = ingredientService.exportRegulatoryIngredientsToExcel();
            return ResponseEntity.ok()
                    .header("Content-Disposition",
                            "attachment; filename=Global_Ingredient_Regulations_" + java.time.LocalDate.now() + ".xlsx")
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(excelContent);
        } catch (Exception e) {
            log.error("Excel export failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/sync-status")
    public ResponseEntity<Boolean> getSyncStatus() {
        return ResponseEntity.ok(ingredientService.isSyncing());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'MENU_INGREDIENTCOMPLIANCE_EDIT')")
    public ResponseEntity<ApiResponse<com.example.ims.entity.RegulatoryIngredient>> updateIngredient(
            @PathVariable("id") Long id,
            @RequestBody com.example.ims.dto.RegulatoryIngredientUpdateDto updatedData) {
        try {
            com.example.ims.entity.RegulatoryIngredient result = ingredientService.updateRegulatoryIngredient(id, updatedData);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            log.error("Failed to update ingredient", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("성분 정보 수정 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}
