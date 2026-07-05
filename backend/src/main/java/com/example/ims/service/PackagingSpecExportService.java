package com.example.ims.service;

import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.PackagingSpecComponent;
import com.example.ims.entity.PackagingSpecRevision;
import com.example.ims.entity.Product;
import com.example.ims.repository.PackagingSpecificationRepository;
import com.example.ims.repository.PackagingSpecComponentRepository;
import com.example.ims.repository.PackagingSpecRevisionRepository;
import com.example.ims.repository.ProductRepository;
import com.itextpdf.text.Document;
import com.itextpdf.text.Font;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

/**
 * Service to generate Excel and PDF exports for Packaging Specifications.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PackagingSpecExportService {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;
    private final PackagingSpecRevisionRepository revisionRepository;
    private final PackagingSpecComponentRepository componentRepository;
    private final com.example.ims.repository.ChannelPackagingRuleRepository channelPackagingRuleRepository;

    /**
     * Generates a simple Excel export for the given product's packaging specs.
     * @param productId Product ID
     * @return byte array containing the Excel file bytes
     * @throws Exception if an error occurs during generation
     */
    public byte[] generateExcel(Long productId) throws Exception {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        List<PackagingSpecification> specs = specRepository.findByProductId(productId);
        specs.sort((a,b) -> {
            int vA = a.getVersion() == null ? 0 : a.getVersion();
            int vB = b.getVersion() == null ? 0 : b.getVersion();
            return Integer.compare(vB, vA); // descending
        });

        Workbook workbook;
        InputStream is = getClass().getResourceAsStream("/templates/packaging_spec_template.xlsx");

        if (is != null) {
            workbook = WorkbookFactory.create(is);
        } else {
            // [Fallback] Template is missing.
            workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            workbook.createSheet("Packaging Specification");
        }

        try (workbook;
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.getSheetAt(0);

            // 제품 특징(용량/중량)을 제품명 뒤에 결합하여 출력
            String capacityInfo = product.getCapacity() != null && !product.getCapacity().isEmpty() ? " " + product.getCapacity() : "";
            String weightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
            String productNameWithSpecs = product.getProductName() + capacityInfo + weightInfo;
            String englishProductNameWithSpecs = (product.getEnglishProductName() != null ? product.getEnglishProductName() : "") + capacityInfo;

            // [채널 규칙 동적 연동]
            boolean isForbiddenExpiry = false;
            boolean stickerRequired = false;
            boolean padAndFrameRequired = false;
            java.util.List<String> channelWarnings = new java.util.ArrayList<>();
            java.util.List<String> specialNotesList = new java.util.ArrayList<>();
            String customPalletSpec = null;
            Double maxPalletHeightLimit = null;

            if (product.getChannels() != null) {
                for (com.example.ims.entity.SalesChannel ch : product.getChannels()) {
                    if ("표기금지".equals(ch.getExpDateFormat())) {
                        isForbiddenExpiry = true;
                    }
                    if (Boolean.TRUE.equals(ch.getPadAndFrameRequired())) {
                        padAndFrameRequired = true;
                    }
                    if (Boolean.TRUE.equals(ch.getChannelStickerRequired())) {
                        stickerRequired = true;
                        channelWarnings.add("[" + ch.getName() + "] ★ 채널 스티커 부착 필수");
                    }
                    
                    // DB에 설정된 채널별 규칙들을 조회하여 연동
                    List<com.example.ims.entity.ChannelPackagingRule> rules = channelPackagingRuleRepository.findByChannel(ch);
                    for (com.example.ims.entity.ChannelPackagingRule rule : rules) {
                        String type = rule.getRuleType();
                        String val = rule.getRuleValue();
                        String msg = rule.getWarningMessage();
                        if (msg != null && !msg.isEmpty()) {
                            channelWarnings.add("[" + ch.getName() + "] " + msg);
                        }
                        if ("STICKER_REQUIRED".equalsIgnoreCase(type)) {
                            if ("부착".equals(val)) {
                                stickerRequired = true;
                                channelWarnings.add("[" + ch.getName() + "] ★ 채널 스티커 부착 필수");
                            }
                        }
                        if ("PALLET_SPEC".equalsIgnoreCase(type) && val != null && !val.isEmpty()) {
                            customPalletSpec = val;
                        }
                        if (("MAX_BOX_HEIGHT".equalsIgnoreCase(type) || "LOAD_HEIGHT".equalsIgnoreCase(type)) && val != null) {
                            try {
                                maxPalletHeightLimit = Double.parseDouble(val);
                            } catch (Exception ignored) {}
                        }
                        if ("PAD_FRAME_REQUIRED".equalsIgnoreCase(type) && "필요".equals(val)) {
                            padAndFrameRequired = true;
                        }
                        if ("SPECIAL_NOTE".equalsIgnoreCase(type) && val != null && !val.trim().isEmpty()) {
                            specialNotesList.add(val);
                        }
                        if ("LABELING".equalsIgnoreCase(type) && "표기금지".equals(val)) {
                            isForbiddenExpiry = true;
                        }
                    }
                }
            }

            // B6 브랜드명, B7 품명(국문), B8 품명(영문), B9 품목코드, B10 제조사, B11 사용기한
            setCellValue(sheet, 5, 4, product.getBrand() != null ? product.getBrand().getName() : "");
            setCellValue(sheet, 6, 4, productNameWithSpecs);
            setCellValue(sheet, 7, 4, englishProductNameWithSpecs);
            setCellValue(sheet, 8, 4, product.getItemCode());
            setCellValue(sheet, 9, 4, product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "");

            if (isForbiddenExpiry) {
                setCellValue(sheet, 10, 4, "사용기한 표시 안함 (제조번호만 표시)");
                setCellValue(sheet, 10, 12, "사용기한 표시 안함");
            } else {
                if (product.getShelfLifeMonths() != null) {
                    setCellValue(sheet, 10, 4, "제조일로부터 " + product.getShelfLifeMonths() + "개월");
                }
                if (product.getOpenedShelfLifeMonths() != null) {
                    setCellValue(sheet, 10, 12, "개봉 후 " + product.getOpenedShelfLifeMonths() + "개월"); // J11: 개봉 후 사용기한 -> M11
                }
            }

            // Dynamic Placeholder Replacer (for compatibility in template)
            for (Row r : sheet) {
                for (org.apache.poi.ss.usermodel.Cell c : r) {
                    if (c.getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                        String v = c.getStringCellValue();
                        if (v != null) {
                            if (v.contains("개봉 후") && v.contains("개월") && product.getOpenedShelfLifeMonths() != null) {
                                if (isForbiddenExpiry) {
                                    c.setCellValue("사용기한 표시 안함");
                                } else {
                                    c.setCellValue("개봉 후 " + product.getOpenedShelfLifeMonths() + "개월");
                                }
                            }
                            if (v.contains("AA00001") && product.getItemCode() != null) {
                                c.setCellValue(product.getItemCode());
                            }
                            if (v.contains("제품명 + 채널명 기재") && product.getProductName() != null) {
                                String channelNames = product.getChannels() != null && !product.getChannels().isEmpty() 
                                    ? " (" + product.getChannels().stream().map(com.example.ims.entity.SalesChannel::getName).collect(java.util.stream.Collectors.joining(", ")) + ")" 
                                    : "";
                                c.setCellValue(productNameWithSpecs + channelNames);
                            }
                            if (v.contains("영문 제품명 기재") && product.getEnglishProductName() != null) {
                                c.setCellValue(englishProductNameWithSpecs);
                            }
                        }
                    }
                }
            }

            // 스펙이 있든 없든 현품표 기본 품목 정보는 출력
            String channelNames = product.getChannels() != null && !product.getChannels().isEmpty() 
                ? " (" + product.getChannels().stream().map(com.example.ims.entity.SalesChannel::getName).collect(java.util.stream.Collectors.joining(", ")) + ")" 
                : "";
            String finalProductChannelName = productNameWithSpecs + channelNames;

            // Sheet 1: 현품표_아웃박스 (Row 4 is index 3, Row 5 is index 4, Row 6 is index 5, Row 7 is index 6, Row 8 is index 7, Row 9 is index 8, Row 10 is index 9)
            if (workbook.getNumberOfSheets() > 1) {
                Sheet sheet1 = workbook.getSheetAt(1);
                // 왼쪽 아웃박스 현품표
                setCellValue(sheet1, 3, 2, product.getItemCode()); // C4 (row 4, col 2)
                setCellValue(sheet1, 4, 2, finalProductChannelName); // C5 (row 5, col 2)
                setCellValue(sheet1, 5, 2, englishProductNameWithSpecs); // C6 (row 6, col 2)
                setCellValue(sheet1, 8, 5, product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : ""); // F9 (row 9, col 5)

                if (isForbiddenExpiry) {
                    setCellValue(sheet1, 6, 5, "사용기한 표시 안함"); // F7: 사용기한 기재 금지 (row 7, col 5)
                }

                // 오른쪽 아웃박스 현품표
                setCellValue(sheet1, 3, 11, product.getItemCode()); // L4 (row 4, col 11)
                setCellValue(sheet1, 4, 11, finalProductChannelName); // L5 (row 5, col 11)
                setCellValue(sheet1, 5, 11, englishProductNameWithSpecs); // L6 (row 6, col 11)
                setCellValue(sheet1, 8, 11, product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : ""); // L9 (row 9, col 11)
                
                if (isForbiddenExpiry) {
                    setCellValue(sheet1, 6, 14, "사용기한 표시 안함"); // O7: 사용기한 기재 금지 (row 7, col 14)
                }
            }

            // Sheet 2: 현품표_팔레트 (Row 4 is index 3, Row 5 is index 4, Row 6 is index 5, Row 7 is index 6, Row 8 is index 7, Row 9 is index 8, Row 10 is index 9)
            if (workbook.getNumberOfSheets() > 2) {
                Sheet sheet2 = workbook.getSheetAt(2);
                // 왼쪽 팔레트 현품표
                setCellValue(sheet2, 3, 2, product.getItemCode()); // C4
                setCellValue(sheet2, 4, 2, finalProductChannelName); // C5
                setCellValue(sheet2, 5, 2, englishProductNameWithSpecs); // C6
                setCellValue(sheet2, 8, 5, product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : ""); // F9

                if (isForbiddenExpiry) {
                    setCellValue(sheet2, 6, 5, "사용기한 표시 안함"); // F7 (row 7, col 5)
                }

                // 오른쪽 바코드 라벨
                setCellValue(sheet2, 3, 9, finalProductChannelName); // J4 (row 4, col 9)
                setCellValue(sheet2, 4, 9, product.getItemCode()); // J5 (row 5, col 9)
                setCellValue(sheet2, 5, 9, "*" + product.getItemCode() + "*"); // J6 (row 6, col 9)
            }

            PackagingSpecification spec;
            if (specs.isEmpty()) {
                // 임시 가상 스펙 생성 (Fallback)
                String palletHeightStr = null;
                if (product.getPalletInfo() != null && product.getPalletInfo().getPalletHeight() != null) {
                    palletHeightStr = String.valueOf(product.getPalletInfo().getPalletHeight());
                }

                spec = PackagingSpecification.builder()
                        .product(product)
                        .inboxQty(product.getInboxInfo() != null ? product.getInboxInfo().getInboxQuantity() : null)
                        .inboxSize((product.getInboxInfo() != null && product.getInboxInfo().getInboxLength() != null && product.getInboxInfo().getInboxWidth() != null && product.getInboxInfo().getInboxHeight() != null)
                            ? product.getInboxInfo().getInboxLength() + "x" + product.getInboxInfo().getInboxWidth() + "x" + product.getInboxInfo().getInboxHeight() : null)
                        .outboxQty(product.getOutboxInfo() != null ? product.getOutboxInfo().getOutboxQuantity() : null)
                        .outboxSize((product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxLength() != null && product.getOutboxInfo().getOutboxWidth() != null && product.getOutboxInfo().getOutboxHeight() != null)
                            ? product.getOutboxInfo().getOutboxLength() + "x" + product.getOutboxInfo().getOutboxWidth() + "x" + product.getOutboxInfo().getOutboxHeight() : null)
                        .oneOutboxWeight(product.getOutboxInfo() != null ? product.getOutboxInfo().getOutboxWeight() : null)
                        .palletSize((product.getPalletInfo() != null && product.getPalletInfo().getPalletLength() != null && product.getPalletInfo().getPalletWidth() != null)
                            ? product.getPalletInfo().getPalletLength() + "x" + product.getPalletInfo().getPalletWidth() : null)
                        .onePalletHeight(product.getPalletInfo() != null ? product.getPalletInfo().getPalletHeight() : null)
                        .palletHeightLimit(palletHeightStr)
                        .build();

                // 1팔레트 중량 계산
                if (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxWeight() != null
                    && product.getPalletInfo() != null && product.getPalletInfo().getPalletQuantity() != null) {
                    double w = product.getOutboxInfo().getOutboxWeight();
                    int q = product.getPalletInfo().getPalletQuantity();
                    spec.setOnePalletWeight(Math.round(w * q * 10.0) / 10.0);
                }
            } else {
                spec = specs.get(0);
            }

            { // ALWAYS RUN USING FALLBACK SPEC

                // 기본 정보 추가 필드
                setCellValue(sheet, 8, 12, spec.getBarcode() != null ? spec.getBarcode() : ""); // J9: 바코드 -> M9
                setCellValue(sheet, 9, 12, spec.getLabNumber() != null ? spec.getLabNumber() : ""); // J10: 랩 넘버 -> M10
                setCellValue(sheet, 11, 4, "v" + (spec.getVersion() != null ? spec.getVersion() : 1)); // E12: 버전
                setCellValue(sheet, 11, 12, product.getProductType() != null ? product.getProductType().toString() : ""); // M12: 품목구분

                // 결재선 JSON 문자열 파싱하여 역할별로 매핑 및 기안/검토일 출력 보완
                String planner = spec.getPlannerName();
                String designer = spec.getDesignerName();
                String qc = spec.getQcName();
                String purchasing = ""; // 구매 담당

                String plannerDate = "";
                String designerDate = "";
                String qcDate = "";
                String purchasingDate = "";

                if (spec.getApprovalChainJson() != null && !spec.getApprovalChainJson().isEmpty()) {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        java.util.List<java.util.Map<String, Object>> list = mapper.readValue(spec.getApprovalChainJson(), new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {});
                        for (java.util.Map<String, Object> map : list) {
                            String role = (String) map.get("role");
                            String name = (String) map.get("name");
                            String date = (String) map.get("date");
                            if ("기획".equals(role)) {
                                planner = name;
                                plannerDate = date;
                            } else if ("디자인".equals(role)) {
                                designer = name;
                                designerDate = date;
                            } else if ("품질".equals(role) || "품질관리".equals(role)) {
                                qc = name;
                                qcDate = date;
                            } else if ("구매".equals(role)) {
                                purchasing = name;
                                purchasingDate = date;
                            }
                        }
                    } catch (Exception e) {
                        // ignore JSON parse fail
                    }
                }

                // Excel 시트 0 결재라인 담당자 셀 (U4: row 3, W4: row 3, Y4: row 3, AA4: row 3)
                setCellValue(sheet, 3, 20, planner != null ? planner : ""); // U4
                setCellValue(sheet, 3, 22, designer != null ? designer : ""); // W4
                setCellValue(sheet, 3, 24, purchasing != null ? purchasing : ""); // Y4
                setCellValue(sheet, 3, 26, qc != null ? qc : ""); // AA4

                // 검토일자 매핑 (U5: row 4, W5: row 4, Y5: row 4, AA5: row 4)
                setCellValue(sheet, 4, 20, plannerDate != null ? plannerDate : ""); // U5
                setCellValue(sheet, 4, 22, designerDate != null ? designerDate : ""); // W5
                setCellValue(sheet, 4, 24, purchasingDate != null ? purchasingDate : ""); // Y5
                setCellValue(sheet, 4, 26, qcDate != null ? qcDate : ""); // AA5

                setCellValue(sheet, 8, 24, spec.getBarcodeManager() != null ? spec.getBarcodeManager() : ""); // Y9

                // 개정 내역 (Row 15: row 14)
                List<PackagingSpecRevision> revisions = revisionRepository.findBySpecId(spec.getId());
                for (int rIdx = 0; rIdx < Math.min(revisions.size(), 3); rIdx++) {
                    PackagingSpecRevision rev = revisions.get(rIdx);
                    setCellValue(sheet, 14 + rIdx, 1, String.valueOf(rev.getRevisionNo())); // B15
                    setCellValue(sheet, 14 + rIdx, 4, rev.getContent()); // E15
                    setCellValue(sheet, 14 + rIdx, 18, rev.getRevisionDate() != null ? rev.getRevisionDate().toString() : ""); // S15
                    setCellValue(sheet, 14 + rIdx, 22, rev.getRevisionAuthor()); // W15
                }

                // 구성품 리스트 BOM (Row 19: row 18)
                List<PackagingSpecComponent> components = componentRepository.findBySpecId(spec.getId());
                for (int cIdx = 0; cIdx < Math.min(components.size(), 6); cIdx++) {
                    PackagingSpecComponent comp = components.get(cIdx);
                    setCellValue(sheet, 18 + cIdx, 1, comp.getComponentName()); // B19
                    setCellValue(sheet, 18 + cIdx, 4, comp.getSpecDetails()); // E19
                    setCellValue(sheet, 18 + cIdx, 9, comp.getSizeDimension()); // J19
                    setCellValue(sheet, 18 + cIdx, 14, comp.getQuantity() != null ? String.valueOf(comp.getQuantity()) : "1"); // O19
                    setCellValue(sheet, 18 + cIdx, 18, comp.getSupplier()); // S19
                    setCellValue(sheet, 18 + cIdx, 22, comp.getRemarks()); // W19
                }

                // 아웃박스 & 착인 기준
                setCellValue(sheet, 26, 4, spec.getMarkingMethod() != null ? spec.getMarkingMethod() : ""); // E27
                
                String markingStd = spec.getMarkingStandard() != null ? spec.getMarkingStandard() : "";
                if (isForbiddenExpiry) {
                    markingStd = "제조일자/사용기한 표기 금지 (제조번호만 표기)";
                } else if (spec.getLotAndExpiryFormat() != null && !spec.getLotAndExpiryFormat().isEmpty()) {
                    markingStd = spec.getLotAndExpiryFormat();
                }
                setCellValue(sheet, 28, 4, markingStd); // E29

                // 포장방법
                setCellValue(sheet, 45, 1, spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : ""); // B46

                // 적재사항: 인박스 & 아웃박스
                setCellValue(sheet, 69, 4, spec.getInboxType() != null ? spec.getInboxType() : "인박스"); // E70 (Row 70 is index 69)
                setCellValue(sheet, 69, 8, spec.getInboxQty() != null ? String.valueOf(spec.getInboxQty()) + " EA" : "-"); // I70
                setCellValue(sheet, 69, 11, spec.getInboxSize() != null ? spec.getInboxSize() : "-"); // L70
                setCellValue(sheet, 69, 15, spec.getInboxTapeBanding() != null ? spec.getInboxTapeBanding() : "N"); // P70
                setCellValue(sheet, 69, 18, spec.getInboxInterlayerSheet() != null ? spec.getInboxInterlayerSheet() : "N"); // S70
                setCellValue(sheet, 69, 21, spec.getInboxMaterial() != null ? spec.getInboxMaterial() : "-"); // V70
                setCellValue(sheet, 69, 24, spec.getInboxRemarks() != null ? spec.getInboxRemarks() : "-"); // Y70

                // 아웃박스 정보
                setCellValue(sheet, 70, 4, spec.getOutboxType() != null ? spec.getOutboxType() : "아웃박스"); // E71 (Row 71 is index 70)
                setCellValue(sheet, 70, 8, spec.getOutboxQty() != null ? String.valueOf(spec.getOutboxQty()) + " 입" : "-"); // I71
                setCellValue(sheet, 70, 11, spec.getOutboxSize() != null ? spec.getOutboxSize() : "-"); // L71
                setCellValue(sheet, 70, 15, spec.getOutboxTapeBanding() != null ? spec.getOutboxTapeBanding() : "N"); // P71
                setCellValue(sheet, 70, 18, spec.getOutboxInterlayerSheet() != null ? spec.getOutboxInterlayerSheet() : "N"); // S71
                setCellValue(sheet, 70, 21, spec.getOutboxMaterial() != null ? spec.getOutboxMaterial() : "-"); // V71
                setCellValue(sheet, 70, 24, spec.getOutboxRemarks() != null ? spec.getOutboxRemarks() : "-"); // Y71

                // 적재사항: 팔레트 (Row 72 is index 71, Row 73 is index 72, Row 74 is index 73, Row 75 is index 74, Row 76 is index 75)
                setCellValue(sheet, 71, 8, spec.getPalletTypeStr() != null ? spec.getPalletTypeStr() : ""); // I72
                setCellValue(sheet, 72, 8, spec.getPalletStackingMethod() != null ? spec.getPalletStackingMethod() : ""); // I73
                setCellValue(sheet, 73, 8, spec.getPalletSize() != null ? spec.getPalletSize() : ""); // I74
                setCellValue(sheet, 74, 8, spec.getPalletHeightLimit() != null ? spec.getPalletHeightLimit() : ""); // I75
                setCellValue(sheet, 75, 8, spec.getPalletPrecautions() != null ? spec.getPalletPrecautions() : ""); // I76

                // 채널 포장 규칙 동적 반영 (팔레트 사양 교체 등)
                if (padAndFrameRequired) {
                    if (spec.getPalletTypeStr() == null || spec.getPalletTypeStr().isEmpty()) {
                        setCellValue(sheet, 71, 8, "수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)"); // I72 default for export
                    }
                    setCellValue(sheet, 75, 8, (spec.getPalletPrecautions() != null && !spec.getPalletPrecautions().isEmpty() ? spec.getPalletPrecautions() + "\n" : "") + "★ 규격에 따라 패드 & 각대 필수 적용"); // I76
                }
                if (customPalletSpec != null) {
                    setCellValue(sheet, 71, 8, customPalletSpec);
                }

                if (maxPalletHeightLimit != null) {
                    setCellValue(sheet, 74, 8, maxPalletHeightLimit.intValue() + " mm 이하");
                }

                // 중량 및 높이 검증 (Row 93 is index 92)
                setCellValue(sheet, 92, 1, spec.getOneOutboxWeight() != null ? String.valueOf(spec.getOneOutboxWeight()) + " kg" : ""); // B93
                setCellValue(sheet, 92, 10, spec.getOnePalletWeight() != null ? String.valueOf(spec.getOnePalletWeight()) + " kg" : ""); // K93
                setCellValue(sheet, 92, 19, spec.getOnePalletHeight() != null ? String.valueOf(spec.getOnePalletHeight()) + " mm" : ""); // T93

                // 특이사항 (Row 95 is index 94) (동적 채널 경고 및 특이사항 문구 추가)
                StringBuilder remarksBuilder = new StringBuilder();
                if (!specialNotesList.isEmpty()) {
                    remarksBuilder.append("★ [채널 포장 특이사항]\n");
                    for (String note : specialNotesList) {
                        remarksBuilder.append("- ").append(note).append("\n");
                    }
                    remarksBuilder.append("\n");
                }
                
                if (!channelWarnings.isEmpty()) {
                    remarksBuilder.append("📢 [채널별 규격 준수 주의사항]\n");
                    for (String warning : channelWarnings) {
                        remarksBuilder.append("- ").append(warning).append("\n");
                    }
                    remarksBuilder.append("\n");
                }

                if (spec.getRemarks() != null) {
                    remarksBuilder.append(spec.getRemarks());
                }
                setCellValue(sheet, 94, 1, remarksBuilder.toString()); // B95

                // Sheet 1: 아웃박스 현품표 수량 및 바코드 보완
                if (workbook.getNumberOfSheets() > 1) {
                    Sheet sheet1 = workbook.getSheetAt(1);
                    setCellValue(sheet1, 7, 2, spec.getOutboxQty() != null ? String.valueOf(spec.getOutboxQty()) + " 입" : "EA"); // C8
                    setCellValue(sheet1, 7, 5, spec.getOneOutboxWeight() != null ? String.valueOf(spec.getOneOutboxWeight()) + " Kg" : "Kg"); // F8
                    setCellValue(sheet1, 9, 2, spec.getBarcode() != null ? spec.getBarcode() : ""); // C10
                    
                    setCellValue(sheet1, 7, 11, spec.getOutboxQty() != null ? String.valueOf(spec.getOutboxQty()) + " 입" : "EA"); // L8
                    setCellValue(sheet1, 7, 14, spec.getOneOutboxWeight() != null ? String.valueOf(spec.getOneOutboxWeight()) + " Kg" : "Kg"); // O8
                    setCellValue(sheet1, 9, 11, spec.getBarcode() != null ? spec.getBarcode() : ""); // L10
                }

                // Sheet 2: 팔레트 현품표 수량 및 바코드 보완
                if (workbook.getNumberOfSheets() > 2) {
                    Sheet sheet2 = workbook.getSheetAt(2);
                    setCellValue(sheet2, 7, 5, spec.getOnePalletWeight() != null ? String.valueOf(spec.getOnePalletWeight()) + " kg" : "kg"); // F8
                    setCellValue(sheet2, 9, 2, spec.getBarcode() != null ? spec.getBarcode() : ""); // C10
                }
            }

            workbook.write(out);
            return out.toByteArray();
        } finally {
            if (is != null) {
                is.close();
            }
        }
    }

    private void setCellValue(Sheet sheet, int rowIndex, int colIndex, String value) {
        Row row = sheet.getRow(rowIndex);
        if (row == null) {
            row = sheet.createRow(rowIndex);
        }
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(colIndex);
        if (cell == null) {
            cell = row.createCell(colIndex);
        }
        cell.setCellValue(value);
    }

    private Integer parseIntSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Integer.parseInt(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    private Double parseDoubleSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Double.parseDouble(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }

    /**
     * Generates a simple PDF export for the given product's packaging specs.
     * @param productId Product ID
     * @return byte array containing the PDF file bytes
     * @throws Exception if an error occurs during generation
     */
    public byte[] generatePdf(Long productId) throws Exception {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        List<PackagingSpecification> specs = specRepository.findByProductId(productId);
        specs.sort((a,b) -> {
            int vA = a.getVersion() == null ? 0 : a.getVersion();
            int vB = b.getVersion() == null ? 0 : b.getVersion();
            return Integer.compare(vA, vB); // ascending for PDF history log
        });

        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        // Font configuration
        BaseFont baseFont;
        try {
            baseFont = BaseFont.createFont("c:/windows/fonts/malgun.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception e) {
            baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        }

        Font titleFont = new Font(baseFont, 18, Font.BOLD);
        Font sectionFont = new Font(baseFont, 12, Font.BOLD);
        Font normalFont = new Font(baseFont, 9, Font.NORMAL);

        // 제품 특징 반영
        String capacityInfo = product.getCapacity() != null && !product.getCapacity().isEmpty() ? " " + product.getCapacity() : "";
        String weightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
        String productNameWithSpecs = product.getProductName() + capacityInfo + weightInfo;
        String englishProductNameWithSpecs = (product.getEnglishProductName() != null ? product.getEnglishProductName() : "") + capacityInfo;

        document.add(new Paragraph("포장사양서 (Packaging Specification Report)", titleFont));
        document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

        // 1. 기본 정보 (Product Details)
        document.add(new Paragraph("[기본 정보 / Product Info]", sectionFont));
        document.add(new Paragraph("브랜드명 (Brand): " + (product.getBrand() != null ? product.getBrand().getName() : "-"), normalFont));
        document.add(new Paragraph("품명(국문) (Product Name): " + productNameWithSpecs, normalFont));
        document.add(new Paragraph("품명(영문) (English Name): " + englishProductNameWithSpecs, normalFont));
        document.add(new Paragraph("품목코드 (Item Code): " + product.getItemCode(), normalFont));
        document.add(new Paragraph("제조사 (Manufacturer): " + (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), normalFont));
        document.add(new Paragraph("사용기한 (Shelf Life): " + (product.getShelfLifeMonths() != null ? "제조일로부터 " + product.getShelfLifeMonths() + "개월" : "-"), normalFont));
        if (product.getOpenedShelfLifeMonths() != null) {
            document.add(new Paragraph("개봉 후 사용기한 (After Opening): 개봉 후 " + product.getOpenedShelfLifeMonths() + "개월", normalFont));
        }
        document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

        if (!specs.isEmpty()) {
            PackagingSpecification spec = specs.get(0); // Use latest or first spec

            // 2. 포장 사양서 상세 정보
            document.add(new Paragraph("[포장사양 상세 / Packaging Spec Details]", sectionFont));
            document.add(new Paragraph("버전 (Version): v" + (spec.getVersion() != null ? spec.getVersion() : 1) + 
                (spec.getRevisionNotes() != null ? " (" + spec.getRevisionNotes() + ")" : ""), normalFont));
            document.add(new Paragraph("바코드 (Barcode): " + (spec.getBarcode() != null ? spec.getBarcode() : "-"), normalFont));
            document.add(new Paragraph("랩 넘버 (Lab Number): " + (spec.getLabNumber() != null ? spec.getLabNumber() : "-"), normalFont));
            document.add(new Paragraph("기획 담당: " + (spec.getPlannerName() != null ? spec.getPlannerName() : "-") + 
                " | 디자인 담당: " + (spec.getDesignerName() != null ? spec.getDesignerName() : "-") + 
                " | 품질관리 담당: " + (spec.getQcName() != null ? spec.getQcName() : "-"), normalFont));
            document.add(new Paragraph("바코드 담당자: " + (spec.getBarcodeManager() != null ? spec.getBarcodeManager() : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 3. 구성품 리스트 (BOM)
            document.add(new Paragraph("[구성품 리스트 / Components BOM]", sectionFont));
            List<PackagingSpecComponent> components = componentRepository.findBySpecId(spec.getId());
            if (components.isEmpty()) {
                document.add(new Paragraph("등록된 구성품이 없습니다.", normalFont));
            } else {
                for (int i = 0; i < components.size(); i++) {
                    PackagingSpecComponent comp = components.get(i);
                    document.add(new Paragraph(String.format(" - %s (%s) | 규격: %s | 수량: %s | 업체: %s | 비고: %s",
                        comp.getComponentName(),
                        comp.getSpecDetails() != null ? comp.getSpecDetails() : "-",
                        comp.getSizeDimension() != null ? comp.getSizeDimension() : "-",
                        comp.getQuantity() != null ? String.valueOf(comp.getQuantity()) : "1",
                        comp.getSupplier() != null ? comp.getSupplier() : "-",
                        comp.getRemarks() != null ? comp.getRemarks() : "-"
                    ), normalFont));
                }
            }
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 4. 아웃박스 & 착인 기준 및 포장방법
            document.add(new Paragraph("[아웃박스 및 착인기준 / Marking & Packaging Method]", sectionFont));
            document.add(new Paragraph("표기 방법: " + (spec.getMarkingMethod() != null ? spec.getMarkingMethod() : "-"), normalFont));
            document.add(new Paragraph("표기 기준: " + (spec.getMarkingStandard() != null ? spec.getMarkingStandard() : "-"), normalFont));
            document.add(new Paragraph("포장방법 (서술):\n" + (spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 5. 적재사항 및 검증 (Loading Specifications & Verification)
            document.add(new Paragraph("[적재 사양 및 검증 / Loading Specs & Verification]", sectionFont));
            document.add(new Paragraph("인박스 구분: " + (spec.getInboxType() != null ? spec.getInboxType() : "-") + 
                " | 입수량: " + (spec.getInboxQty() != null ? spec.getInboxQty() + " ea" : "-") + 
                " | 사이즈: " + (spec.getInboxSize() != null ? spec.getInboxSize() : "-") +
                " | 재질: " + (spec.getInboxMaterial() != null ? spec.getInboxMaterial() : "-"), normalFont));

            document.add(new Paragraph("아웃박스 구분: " + (spec.getOutboxType() != null ? spec.getOutboxType() : "-") + 
                " | 입수량: " + (spec.getOutboxQty() != null ? spec.getOutboxQty() + " ea" : "-") + 
                " | 사이즈: " + (spec.getOutboxSize() != null ? spec.getOutboxSize() : "-") +
                " | 재질: " + (spec.getOutboxMaterial() != null ? spec.getOutboxMaterial() : "-"), normalFont));

            document.add(new Paragraph("팔레트 종류: " + (spec.getPalletTypeStr() != null ? spec.getPalletTypeStr() : "-") + 
                " | 적재방법: " + (spec.getPalletStackingMethod() != null ? spec.getPalletStackingMethod() : "-") + 
                " | 사이즈: " + (spec.getPalletSize() != null ? spec.getPalletSize() : "-"), normalFont));

            document.add(new Paragraph("1 아웃박스 중량: " + (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "-") + 
                " | 1 팔레트 중량: " + (spec.getOnePalletWeight() != null ? spec.getOnePalletWeight() + " kg" : "-") + 
                " | 1 팔레트 높이: " + (spec.getOnePalletHeight() != null ? spec.getOnePalletHeight() + " mm" : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 6. 특이사항
            document.add(new Paragraph("[특이사항 / Remarks]", sectionFont));
            document.add(new Paragraph(spec.getRemarks() != null ? spec.getRemarks() : "-", normalFont));
        } else {
            document.add(new Paragraph("등록된 포장 사양서 내용이 없습니다.", normalFont));
        }

        document.close();
        return out.toByteArray();
    }
}
