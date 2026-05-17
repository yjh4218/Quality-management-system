package com.example.ims.service;

import com.example.ims.entity.RegulatoryIngredient;
import com.example.ims.repository.RegulatoryIngredientRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductIngredientService {

    private final RegulatoryIngredientRepository regulatoryRepository;
    private final RegulatoryCrawlerService crawlerService;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<com.example.ims.entity.RegulatoryIngredient> getAllRegulatoryIngredients() {
        return regulatoryRepository.findAll();
    }

    public void triggerManualSync(List<String> countries) {
        if (crawlerService.isSyncing()) {
            throw new IllegalStateException("데이터 동기화가 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.");
        }
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                crawlerService.syncByCountries(countries);
            } catch (Exception e) {
                log.error(">>>> [ASYNC SYNC] Background sync failed", e);
            }
        });
    }

    public boolean isSyncing() {
        return crawlerService.isSyncing();
    }

    public byte[] exportRegulatoryIngredientsToExcel() throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Global Regulations");
            
            // Header (Localized to Korean)
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                "INCI Name (Eng)", "성분명 (Kor)", "CAS No.", 
                "한국 (KR)", "한국 한도 (%)", 
                "유럽 (EU)", "유럽 한도 (%)", 
                "중국 (CN)", "중국 한도 (%)", 
                "미국 (US)", "미국 한도 (%)", 
                "일본 (JP)", "일본 한도 (%)"
            };
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                CellStyle style = workbook.createCellStyle();
                Font font = workbook.createFont();
                font.setBold(true);
                style.setFont(font);
                cell.setCellStyle(style);
            }

            List<RegulatoryIngredient> ingredients = regulatoryRepository.findAll();
            int rowIdx = 1;
            for (RegulatoryIngredient ing : ingredients) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(ing.getInciName());
                row.createCell(1).setCellValue(ing.getKoreanName() != null ? ing.getKoreanName() : "");
                row.createCell(2).setCellValue(ing.getCasNumber() != null ? ing.getCasNumber() : "");
                
                // Status Translation Helper
                row.createCell(3).setCellValue(translateStatus(ing.getKrStatus()));
                row.createCell(4).setCellValue(ing.getKrLimit() != null ? ing.getKrLimit() : 0.0);
                
                row.createCell(5).setCellValue(translateStatus(ing.getEuStatus()));
                row.createCell(6).setCellValue(ing.getEuLimit() != null ? ing.getEuLimit() : 0.0);
                
                row.createCell(7).setCellValue(translateStatus(ing.getCnStatus()));
                row.createCell(8).setCellValue(ing.getCnLimit() != null ? ing.getCnLimit() : 0.0);
                
                row.createCell(9).setCellValue(translateStatus(ing.getUsStatus()));
                row.createCell(10).setCellValue(ing.getUsLimit() != null ? ing.getUsLimit() : 0.0);
                
                row.createCell(11).setCellValue(translateStatus(ing.getJpStatus()));
                row.createCell(12).setCellValue(ing.getJpLimit() != null ? ing.getJpLimit() : 0.0);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private String translateStatus(String status) {
        if (status == null) return "미지정";
        switch (status) {
            case "ALLOWED": return "사용가능";
            case "RESTRICTED": return "배합한도";
            case "PROHIBITED": return "사용불가";
            default: return "미지정";
        }
    }

    @Data
    @Builder
    public static class IngredientAnalysisResult {
        private String inciName;
        private Double percentage;
        private String status; // OK, CAUTION, DANGER
        private String message;
        private List<String> countryViolations;
    }

    public List<IngredientAnalysisResult> analyzeIngredientsFromExcel(MultipartFile file) throws Exception {
        List<IngredientAnalysisResult> results = new ArrayList<>();
        
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            
            // Assume Row 0 is header. Data starts from Row 1.
            // Column 0: INCI Name, Column 1: Percentage (%)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell nameCell = row.getCell(0);
                Cell percentCell = row.getCell(1);

                if (nameCell == null || nameCell.getCellType() == CellType.BLANK) continue;

                String inciName = nameCell.getStringCellValue().trim();
                Double percentage = 0.0;
                if (percentCell != null && percentCell.getCellType() == CellType.NUMERIC) {
                    percentage = percentCell.getNumericCellValue();
                }

                results.add(analyzeSingleIngredient(inciName, percentage));
            }
        }
        
        return results;
    }

    private IngredientAnalysisResult analyzeSingleIngredient(String inciName, Double percentage) {
        List<RegulatoryIngredient> regulations = regulatoryRepository.findByInciName(inciName);
        
        if (regulations.isEmpty()) {
            return IngredientAnalysisResult.builder()
                    .inciName(inciName)
                    .percentage(percentage)
                    .status("OK")
                    .message("등록된 규제 정보가 없습니다. (미관리 대상)")
                    .countryViolations(new ArrayList<>())
                    .build();
        }

        List<String> violations = new ArrayList<>();
        String status = "OK";
        StringBuilder message = new StringBuilder();

        // 모든 규제 레코드를 순회하며 가장 엄격한 규제를 적용
        for (RegulatoryIngredient reg : regulations) {
            // Check KR
            if ("PROHIBITED".equalsIgnoreCase(reg.getKrStatus()) && !violations.contains("KOREA (금지)")) {
                status = "DANGER";
                violations.add("KOREA (금지)");
            } else if ("RESTRICTED".equalsIgnoreCase(reg.getKrStatus())) {
                Double limit = reg.getKrLimit();
                if (limit != null && percentage > limit) {
                    String v = "KOREA (한도초과: " + limit + "%)";
                    if (!violations.contains(v)) { status = "DANGER"; violations.add(v); }
                }
            }

            // Check EU
            if ("PROHIBITED".equalsIgnoreCase(reg.getEuStatus()) && !violations.contains("EU (금지)")) {
                status = "DANGER";
                violations.add("EU (금지)");
            } else if ("RESTRICTED".equalsIgnoreCase(reg.getEuStatus())) {
                Double limit = reg.getEuLimit();
                if (limit != null && percentage > limit) {
                    String v = "EU (한도초과: " + limit + "%)";
                    if (!violations.contains(v)) { status = "DANGER"; violations.add(v); }
                }
            }

            // Check CN
            if ("PROHIBITED".equalsIgnoreCase(reg.getCnStatus()) && !violations.contains("CHINA (금지)")) {
                status = "DANGER";
                violations.add("CHINA (금지)");
            } else if ("RESTRICTED".equalsIgnoreCase(reg.getCnStatus())) {
                Double limit = reg.getCnLimit();
                if (limit != null && percentage > limit) {
                    String v = "CHINA (한도초과: " + limit + "%)";
                    if (!violations.contains(v)) { status = "DANGER"; violations.add(v); }
                }
            }

            // Check US
            if ("PROHIBITED".equalsIgnoreCase(reg.getUsStatus()) && !violations.contains("USA (금지)")) {
                status = "DANGER";
                violations.add("USA (금지)");
            } else if ("RESTRICTED".equalsIgnoreCase(reg.getUsStatus())) {
                Double limit = reg.getUsLimit();
                if (limit != null && percentage > limit) {
                    String v = "USA (한도초과: " + limit + "%)";
                    if (!violations.contains(v)) { status = "DANGER"; violations.add(v); }
                }
            }

            // Check JP
            if ("PROHIBITED".equalsIgnoreCase(reg.getJpStatus()) && !violations.contains("JAPAN (금지)")) {
                status = "DANGER";
                violations.add("JAPAN (금지)");
            } else if ("RESTRICTED".equalsIgnoreCase(reg.getJpStatus())) {
                Double limit = reg.getJpLimit();
                if (limit != null && percentage > limit) {
                    String v = "JAPAN (한도초과: " + limit + "%)";
                    if (!violations.contains(v)) { status = "DANGER"; violations.add(v); }
                }
            }
        }

        if (violations.isEmpty()) {
            message.append("모든 국가 규제를 준수합니다.");
        } else {
            message.append("다음 국가 규정 위반이 감지되었습니다: ").append(String.join(", ", violations));
        }

        return IngredientAnalysisResult.builder()
                .inciName(inciName)
                .percentage(percentage)
                .status(status)
                .message(message.toString())
                .countryViolations(violations)
                .build();
    }

    @org.springframework.transaction.annotation.Transactional
    public com.example.ims.entity.RegulatoryIngredient updateRegulatoryIngredient(Long id, com.example.ims.dto.RegulatoryIngredientUpdateDto updated) {
        log.info(">>>> [DEBUG] Updating ingredient id: {}, payload: {}", id, updated);
        com.example.ims.entity.RegulatoryIngredient existing = regulatoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found with id: " + id));
        
        // Update basic info
        if (updated.getKoreanName() != null) existing.setKoreanName(updated.getKoreanName());
        if (updated.getCasNumber() != null) existing.setCasNumber(updated.getCasNumber());
        if (updated.getRemarks() != null) existing.setRemarks(updated.getRemarks());
        
        // Update Statuses
        if (updated.getKrStatus() != null) existing.setKrStatus(updated.getKrStatus());
        if (updated.getKrLimit() != null) existing.setKrLimit(updated.getKrLimit());
        if (updated.getEuStatus() != null) existing.setEuStatus(updated.getEuStatus());
        if (updated.getEuLimit() != null) existing.setEuLimit(updated.getEuLimit());
        if (updated.getCnStatus() != null) existing.setCnStatus(updated.getCnStatus());
        if (updated.getCnLimit() != null) existing.setCnLimit(updated.getCnLimit());
        if (updated.getUsStatus() != null) existing.setUsStatus(updated.getUsStatus());
        if (updated.getUsLimit() != null) existing.setUsLimit(updated.getUsLimit());
        if (updated.getJpStatus() != null) existing.setJpStatus(updated.getJpStatus());
        if (updated.getJpLimit() != null) existing.setJpLimit(updated.getJpLimit());

        // Update Granular Limits (Sync list from DTO)
        if (updated.getIngredientLimitDetails() != null) {
            existing.getLimitDetails().clear();
            for (com.example.ims.dto.IngredientLimitDetailDto dto : updated.getIngredientLimitDetails()) {
                com.example.ims.entity.IngredientLimitDetail entity = com.example.ims.entity.IngredientLimitDetail.builder()
                        .ingredient(existing)
                        .country(dto.getCountry())
                        .productType(dto.getProductType())
                        .limitPercent(dto.getLimitPercent())
                        .conditionText(dto.getConditionText())
                        .isManual(true)
                        .build();
                existing.getLimitDetails().add(entity);
            }
        }

        return regulatoryRepository.save(existing);
    }
}
