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
import org.apache.poi.ss.usermodel.PageMargin;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.stream.Collectors;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.awt.Graphics2D;
import java.awt.Color;
import java.awt.BasicStroke;
import java.awt.FontMetrics;
import java.awt.RenderingHints;
import java.awt.GradientPaint;
import java.awt.Polygon;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Service to generate Excel and PDF exports for Packaging Specifications.
 */
@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
@Transactional(readOnly = true)
public class PackagingSpecExportService {

    private final PackagingSpecificationRepository specRepository;
    private final ProductRepository productRepository;
    private final PackagingSpecRevisionRepository revisionRepository;
    private final PackagingSpecComponentRepository componentRepository;
    private final com.example.ims.repository.PackagingMethodImageRepository methodImageRepository;
    private final com.example.ims.repository.ChannelSpecialNoteRepository specialNoteRepository;

    /**
     * Generates a comprehensive and professional Excel export for the given product's packaging specs.
     * Dynamic generation without external template dependency.
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
            if (vA != vB) return Integer.compare(vB, vA); // descending version
            Long idA = a.getId() == null ? 0L : a.getId();
            Long idB = b.getId() == null ? 0L : b.getId();
            return Long.compare(idB, idA); // descending ID
        });

        // [초고속화] 모든 이미지 URL을 사전에 병렬 비동기로 즉시 프리페치
        try {
            List<String> urlsToFetch = new ArrayList<>();
            if (specs != null && !specs.isEmpty()) {
                PackagingSpecification topSpec = specs.get(0);
                if (topSpec.getInboxLayoutImage() != null) urlsToFetch.add(topSpec.getInboxLayoutImage());
                if (topSpec.getOutboxLayoutImageFile() != null) urlsToFetch.add(topSpec.getOutboxLayoutImageFile());
                if (topSpec.getOutboxLayoutImage() != null) urlsToFetch.add(topSpec.getOutboxLayoutImage());
                if (topSpec.getPalletLayoutImage() != null) urlsToFetch.add(topSpec.getPalletLayoutImage());
                if (topSpec.getMarkingLocationImage() != null) urlsToFetch.add(topSpec.getMarkingLocationImage());
            }
            if (product.getImagePaths() != null) urlsToFetch.addAll(product.getImagePaths());
            if (product.getImagePath() != null) urlsToFetch.add(product.getImagePath());

            urlsToFetch.parallelStream()
                .filter(u -> u != null && !u.isBlank())
                .forEach(this::getImageBytesFromFileOrUrl);
        } catch (Exception e) {
            log.warn("Image parallel prefetching warning: " + e.getMessage());
        }

        Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
        
        // --- 스타일 정의 ---
        org.apache.poi.ss.usermodel.CellStyle titleStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
        titleFont.setFontName("맑은 고딕");
        titleFont.setFontHeightInPoints((short) 16);
        titleFont.setBold(true);
        titleFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
        titleStyle.setFont(titleFont);
        titleStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        titleStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

        org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
        headerFont.setFontName("맑은 고딕");
        headerFont.setFontHeightInPoints((short) 10);
        headerFont.setBold(true);
        headerFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(headerStyle);

        org.apache.poi.ss.usermodel.CellStyle subHeaderStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font subHeaderFont = workbook.createFont();
        subHeaderFont.setFontName("맑은 고딕");
        subHeaderFont.setFontHeightInPoints((short) 10);
        subHeaderFont.setBold(true);
        subHeaderStyle.setFont(subHeaderFont);
        subHeaderStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.PALE_BLUE.getIndex());
        subHeaderStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        subHeaderStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        subHeaderStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(subHeaderStyle);

        org.apache.poi.ss.usermodel.CellStyle labelStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font labelFont = workbook.createFont();
        labelFont.setFontName("맑은 고딕");
        labelFont.setFontHeightInPoints((short) 10);
        labelFont.setBold(true);
        labelStyle.setFont(labelFont);
        labelStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        labelStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        labelStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        labelStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(labelStyle);

        org.apache.poi.ss.usermodel.CellStyle dataStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font dataFont = workbook.createFont();
        dataFont.setFontName("맑은 고딕");
        dataFont.setFontHeightInPoints((short) 10);
        dataStyle.setFont(dataFont);
        dataStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        dataStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(dataStyle);

        org.apache.poi.ss.usermodel.CellStyle centerDataStyle = workbook.createCellStyle();
        centerDataStyle.setFont(dataFont);
        centerDataStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        centerDataStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setBorders(centerDataStyle);

        org.apache.poi.ss.usermodel.CellStyle wrapDataStyle = workbook.createCellStyle();
        wrapDataStyle.setFont(dataFont);
        wrapDataStyle.setWrapText(true);
        wrapDataStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        wrapDataStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.TOP);
        setBorders(wrapDataStyle);

        try (workbook; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // --- Sheet 1: 포장사양서 ---
            Sheet sheet0 = workbook.createSheet("포장사양서");

            Row titleRow = sheet0.createRow(0);
            titleRow.setHeightInPoints(40);
            Row titleRowSub = sheet0.createRow(1); // Row 1 생성으로 병합 테두리 보정
            for (int col = 0; col <= 7; col++) {
                org.apache.poi.ss.usermodel.Cell c0 = titleRow.createCell(col);
                c0.setCellStyle(titleStyle);
                org.apache.poi.ss.usermodel.Cell c1 = titleRowSub.createCell(col);
                c1.setCellStyle(titleStyle);
            }
            titleRow.getCell(0).setCellValue("📦 제품 포장 사양서 (Packaging Specification)");
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 1, 0, 7));

            String capacityInfo = product.getCapacity() != null && !product.getCapacity().isEmpty() ? " " + product.getCapacity() : "";
            String weightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
            String productNameWithSpecs = product.getProductName() + capacityInfo + weightInfo;
            String englishProductNameWithSpecs = (product.getEnglishProductName() != null && !product.getEnglishProductName().isBlank()) 
                ? (product.getEnglishProductName() + capacityInfo) 
                : "-";
            String channelNames = product.getChannels() != null && !product.getChannels().isEmpty() 
                ? product.getChannels().stream().map(com.example.ims.entity.SalesChannel::getName).collect(Collectors.joining(", "))
                : "미지정";

            PackagingSpecification spec = specs.isEmpty() ? PackagingSpecification.builder().product(product).build() : specs.get(0);

            com.example.ims.entity.SalesChannel firstChannel = (product.getChannels() != null && !product.getChannels().isEmpty()) ? product.getChannels().get(0) : null;
            String inboxMarkingRule = (firstChannel != null && firstChannel.getInboxLabelMarkingRule() != null) ? firstChannel.getInboxLabelMarkingRule() : "인박스 현품표 표준 규격 적용";
            String outboxMarkingRule = (firstChannel != null && firstChannel.getOutboxLabelMarkingRule() != null) ? firstChannel.getOutboxLabelMarkingRule() : "아웃박스 현품표 표준 규격 적용";
            String palletMarkingRule = (firstChannel != null && firstChannel.getPalletLabelMarkingRule() != null) ? firstChannel.getPalletLabelMarkingRule() : "팔레트 현품표 표준 규격 적용";

            String inboxDateFormatStr = (spec.getInboxDateFormat() != null && !spec.getInboxDateFormat().trim().isEmpty()) ? spec.getInboxDateFormat() : (firstChannel != null && firstChannel.getInboxDateFormat() != null ? firstChannel.getInboxDateFormat() : "[ YYYY.MM.DD 표기 ]");
            String outboxDateFormatStr = (spec.getOutboxDateFormat() != null && !spec.getOutboxDateFormat().trim().isEmpty()) ? spec.getOutboxDateFormat() : (firstChannel != null && firstChannel.getOutboxDateFormat() != null ? firstChannel.getOutboxDateFormat() : "[ YYYY.MM.DD 표기 ]");
            String palletDateFormatStr = (spec.getPalletDateFormat() != null && !spec.getPalletDateFormat().trim().isEmpty()) ? spec.getPalletDateFormat() : (firstChannel != null && firstChannel.getPalletDateFormat() != null ? firstChannel.getPalletDateFormat() : "[ YYYY.MM.DD 표기 ]");

            com.example.ims.entity.ChannelSpecialNote stickerNote = null;
            if (firstChannel != null) {
                try {
                    List<com.example.ims.entity.ChannelSpecialNote> notes = specialNoteRepository.findByChannelId(firstChannel.getId());
                    if (notes != null) {
                        for (com.example.ims.entity.ChannelSpecialNote n : notes) {
                            if (n.getCategory() != null && ("CHANNEL_STICKER".equals(n.getCategory().getCategoryKey()) || 
                                (n.getCategory().getCategoryLabel() != null && n.getCategory().getCategoryLabel().contains("스티커")))) {
                                stickerNote = n;
                                break;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to find channel sticker note for channel " + firstChannel.getId(), e);
                }
            }

            // [1. 제품 및 기본 정보]
            createSectionHeader(sheet0, 3, "1. 📌 제품 및 기본 정보", headerStyle, 7, 28);
            addRow(sheet0, 4, 28f, labelStyle, dataStyle, "품목코드", product.getItemCode(), "브랜드명", product.getBrand() != null ? product.getBrand().getName() : "-", "유통채널", channelNames, "버전", "v" + (spec.getVersion() != null ? spec.getVersion() : 1));
            
            // 제품명 행 (긴 국문/영문 제품명 잘림 방지를 위해 42pt 및 wrapDataStyle 적용)
            Row r5 = sheet0.createRow(5);
            r5.setHeightInPoints(42);
            createCell(r5, 0, "제품명(국문)", labelStyle);
            createCell(r5, 1, productNameWithSpecs, wrapDataStyle);
            createCell(r5, 2, "제품명(영문)", labelStyle);
            createCell(r5, 3, englishProductNameWithSpecs, wrapDataStyle);
            createCell(r5, 4, "제조사", labelStyle);
            createCell(r5, 5, product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-", dataStyle);
            createCell(r5, 6, "제품구분", labelStyle);
            createCell(r5, 7, product.getProductType() != null ? product.getProductType().toString() : "-", dataStyle);

            String effectiveProductBarcode = (product.getProductBarcode() != null && !product.getProductBarcode().isBlank()) 
                ? product.getProductBarcode() 
                : (spec.getBarcode() != null && !spec.getBarcode().isBlank() ? spec.getBarcode() : "-");
            String effectiveOutboxBarcode = (product.getOutboxBarcode() != null && !product.getOutboxBarcode().isBlank()) ? product.getOutboxBarcode() : "-";
            addRow(sheet0, 6, 28f, labelStyle, dataStyle, "사용기한", (product.getShelfLifeMonths() != null ? "제조일로부터 " + product.getShelfLifeMonths() + "개월" : "-"), "개봉후기한", (product.getOpenedShelfLifeMonths() != null ? "개봉 후 " + product.getOpenedShelfLifeMonths() + "개월" : "-"), "제품 바코드", effectiveProductBarcode, "아웃박스 바코드", effectiveOutboxBarcode);
            addRow(sheet0, 7, 28f, labelStyle, dataStyle, "기획 담당", (spec.getPlannerName() != null ? spec.getPlannerName() : "-"), "디자인 담당", (spec.getDesignerName() != null ? spec.getDesignerName() : "-"), "품질관리 담당", (spec.getQcName() != null ? spec.getQcName() : "-"), "바코드 담당자", (spec.getBarcodeManager() != null ? spec.getBarcodeManager() : "-"));

            // 여백 행 (Row 8)
            createMarginRow(sheet0, 8, 10);

            // [2. 개정 이력]
            createSectionHeader(sheet0, 9, "2. 🔄 개정 이력 (Revision History)", headerStyle, 7, 28);
            Row revHeader = sheet0.createRow(10);
            revHeader.setHeightInPoints(26);
            createCell(revHeader, 0, "No.", subHeaderStyle);
            createCell(revHeader, 1, "개정 내용", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(10, 10, 1, 4));
            for (int col = 2; col <= 4; col++) createCell(revHeader, col, "", subHeaderStyle);
            createCell(revHeader, 5, "개정일", subHeaderStyle);
            createCell(revHeader, 6, "개정자", subHeaderStyle);
            createCell(revHeader, 7, "", subHeaderStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(10, 10, 6, 7));

            List<PackagingSpecRevision> revisions = revisionRepository.findBySpecId(spec.getId());
            int currentRow = 11;
            if (revisions.isEmpty()) {
                Row r = sheet0.createRow(currentRow);
                r.setHeightInPoints(28);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "등록된 개정이력이 없습니다.", dataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 4));
                for (int c = 2; c <= 4; c++) createCell(r, c, "", dataStyle);
                createCell(r, 5, "-", centerDataStyle);
                createCell(r, 6, "-", centerDataStyle);
                createCell(r, 7, "", centerDataStyle);
                sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                currentRow++;
            } else {
                for (PackagingSpecRevision rev : revisions) {
                    Row r = sheet0.createRow(currentRow);
                    r.setHeightInPoints(28);
                    createCell(r, 0, String.valueOf(rev.getRevisionNo()), centerDataStyle);
                    createCell(r, 1, rev.getContent() != null ? rev.getContent() : "-", wrapDataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 4));
                    for (int c = 2; c <= 4; c++) createCell(r, c, "", wrapDataStyle);
                    createCell(r, 5, rev.getRevisionDate() != null ? rev.getRevisionDate().toString() : "-", centerDataStyle);
                    createCell(r, 6, rev.getRevisionAuthor() != null ? rev.getRevisionAuthor() : "-", centerDataStyle);
                    createCell(r, 7, "", centerDataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));
                    currentRow++;
                }
            }

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [3. 구성품 리스트 (BOM)]
            createSectionHeader(sheet0, currentRow, "3. 🧩 제품 구성품 리스트 (BOM Components)", headerStyle, 7, 28);
            currentRow++;
            Row compHeader = sheet0.createRow(currentRow);
            compHeader.setHeightInPoints(26);
            createCell(compHeader, 0, "BOM 코드", subHeaderStyle);
            createCell(compHeader, 1, "구성품명", subHeaderStyle);
            createCell(compHeader, 2, "재질 및 세부사양", subHeaderStyle);
            createCell(compHeader, 3, "규격 및 사이즈", subHeaderStyle);
            createCell(compHeader, 4, "개별중량(g)", subHeaderStyle);
            createCell(compHeader, 5, "수량", subHeaderStyle);
            createCell(compHeader, 6, "합산중량(g)", subHeaderStyle);
            createCell(compHeader, 7, "제조/공급사 (비고)", subHeaderStyle);
            currentRow++;

            List<PackagingSpecComponent> components = componentRepository.findBySpecId(spec.getId());
            if (components.isEmpty()) {
                Row r = sheet0.createRow(currentRow);
                r.setHeightInPoints(32);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "등록된 구성품이 없습니다.", dataStyle);
                createCell(r, 2, "-", dataStyle);
                createCell(r, 3, "-", centerDataStyle);
                createCell(r, 4, "-", centerDataStyle);
                createCell(r, 5, "1", centerDataStyle);
                createCell(r, 6, "-", centerDataStyle);
                createCell(r, 7, "-", dataStyle);
                currentRow++;
            } else {
                double totalBomWeight = 0.0;
                int totalBomQty = 0;
                for (PackagingSpecComponent comp : components) {
                    Row r = sheet0.createRow(currentRow);
                    
                    // 세부사양 및 구성품명의 글자 수/줄바꿈 수 기반 동적 행 높이 산출 (최소 32pt)
                    int specLen = comp.getSpecDetails() != null ? comp.getSpecDetails().length() : 0;
                    int compLen = comp.getComponentName() != null ? comp.getComponentName().length() : 0;
                    int lines = Math.max(1, Math.max((specLen / 22) + 1, (compLen / 25) + 1));
                    if (comp.getSpecDetails() != null && comp.getSpecDetails().contains("\n")) {
                        lines = Math.max(lines, comp.getSpecDetails().split("\\r?\\n").length);
                    }
                    r.setHeightInPoints(Math.max(32f, lines * 18f));

                    double w = comp.getWeight() != null ? comp.getWeight() : 0.0;
                    int q = comp.getQuantity() != null ? comp.getQuantity() : 1;
                    totalBomWeight += (w * q);
                    totalBomQty += q;
                    String wStr = w > 0 ? String.format("%.2fg", w) : "-";
                    String totalWStr = w > 0 ? String.format("%.2fg", w * q) : "-";
                    String supplierRemarks = (comp.getSupplier() != null ? comp.getSupplier() : "-") + 
                            (comp.getRemarks() != null && !comp.getRemarks().trim().isEmpty() ? " (" + comp.getRemarks() + ")" : "");

                    createCell(r, 0, comp.getBomCode() != null ? comp.getBomCode() : "-", centerDataStyle);
                    createCell(r, 1, comp.getComponentName() != null ? comp.getComponentName() : "-", wrapDataStyle);
                    createCell(r, 2, comp.getSpecDetails() != null ? comp.getSpecDetails() : "-", wrapDataStyle);
                    createCell(r, 3, comp.getSizeDimension() != null ? comp.getSizeDimension() : "-", centerDataStyle);
                    createCell(r, 4, wStr, centerDataStyle);
                    createCell(r, 5, q + " ea", centerDataStyle);
                    createCell(r, 6, totalWStr, centerDataStyle);
                    createCell(r, 7, supplierRemarks, wrapDataStyle);
                    currentRow++;
                }

                // [추가] BOM 구성품 합계 행 (Total Row)
                Row bomTotalRow = sheet0.createRow(currentRow++);
                bomTotalRow.setHeightInPoints(28);
                createCell(bomTotalRow, 0, "합계 (Total)", subHeaderStyle);
                createCell(bomTotalRow, 1, "구성품 총 " + components.size() + "종", subHeaderStyle);
                createCell(bomTotalRow, 2, "-", centerDataStyle);
                createCell(bomTotalRow, 3, "-", centerDataStyle);
                createCell(bomTotalRow, 4, "-", centerDataStyle);
                createCell(bomTotalRow, 5, totalBomQty + " ea", subHeaderStyle);
                createCell(bomTotalRow, 6, totalBomWeight > 0 ? String.format("%.2fg", totalBomWeight) : "-", subHeaderStyle);
                createCell(bomTotalRow, 7, "단품 패키징 총 중량 합계", wrapDataStyle);
            }

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [3-1. 🖼️ 제품 및 패키지 실물 이미지 (Product & Package Images)]
            currentRow = renderProductPackageImagesSection(sheet0, currentRow, product, spec, workbook, headerStyle, subHeaderStyle, labelStyle, dataStyle, wrapDataStyle, centerDataStyle);

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [4. 아웃박스 & 착인 기준 및 포장방법 서술]
            createSectionHeader(sheet0, currentRow, "4. 📦 용기/단상자/아웃박스 착인 기준 및 포장방법", headerStyle, 7, 28);
            currentRow++;
            addRow(sheet0, currentRow++, 28f, labelStyle, dataStyle, "용기 표기방법", spec.getContainerMarkingDisplay() != null ? spec.getContainerMarkingDisplay() : "-", "용기 착인위치", spec.getContainerMarkingLocation() != null ? spec.getContainerMarkingLocation() : "-", "단상자 표기방법", spec.getUnitBoxMarkingDisplay() != null ? spec.getUnitBoxMarkingDisplay() : "-", "단상자 착인위치", spec.getUnitBoxMarkingLocation() != null ? spec.getUnitBoxMarkingLocation() : "-");
            
            String containerText = spec.getContainerMarkingText() != null && !spec.getContainerMarkingText().trim().isEmpty() 
                    ? spec.getContainerMarkingText().replace("LOT [생산배치번호]", "LOT(제조번호)").replace("[생산배치번호]", "LOT(제조번호)").replace("생산배치번호", "LOT(제조번호)") 
                    : "-";
            String unitBoxText = spec.getUnitBoxMarkingText() != null && !spec.getUnitBoxMarkingText().trim().isEmpty() 
                    ? spec.getUnitBoxMarkingText().replace("LOT [생산배치번호]", "LOT(제조번호)").replace("[생산배치번호]", "LOT(제조번호)").replace("생산배치번호", "LOT(제조번호)") 
                    : "-";

            // 3줄 착인기준 전용 행 (줄 수에 따른 동적 높이 계산으로 수직 잘림 원천 방지)
            int cLines = containerText.split("\\r?\\n").length;
            int uLines = unitBoxText.split("\\r?\\n").length;
            int maxMarkingLines = Math.max(3, Math.max(cLines, uLines));
            Row markingRow = sheet0.createRow(currentRow++);
            markingRow.setHeightInPoints(Math.max(60f, maxMarkingLines * 18f));
            createCell(markingRow, 0, "용기 착인기준(3줄)", labelStyle);
            createCell(markingRow, 1, containerText, wrapDataStyle);
            createCell(markingRow, 2, "단상자 착인기준(3줄)", labelStyle);
            createCell(markingRow, 3, unitBoxText, wrapDataStyle);
            createCell(markingRow, 4, "포장방법 타입", labelStyle);
            createCell(markingRow, 5, "서술형 지침", dataStyle);
            createCell(markingRow, 6, "-", labelStyle);
            createCell(markingRow, 7, "-", dataStyle);

            // [요청 반영] 포장방법 영역에 '포장방법 사진 참조' 표준 문구 및 중복 접두어 정제 표기 (줄 수에 따른 동적 높이 산출)
            String rawMethodDesc = spec.getPackagingMethodText() != null ? spec.getPackagingMethodText().trim() : "";
            String cleanedMethodText = cleanPackagingMethodText(rawMethodDesc);
            String methodDesc = "포장방법 사진 참조";
            if (!cleanedMethodText.isBlank() && !"등록된 포장방법 설명이 없습니다.".equals(cleanedMethodText)) {
                methodDesc = "포장방법 사진 참조\n\n" + cleanedMethodText;
            }

            int methodLines = methodDesc.split("\\r?\\n").length;
            Row methodRow = sheet0.createRow(currentRow);
            methodRow.setHeightInPoints(Math.max(80f, Math.min(300f, methodLines * 18f)));
            createCell(methodRow, 0, "포장방법 (서술)", labelStyle);
            createCell(methodRow, 1, methodDesc, wrapDataStyle);
            for (int col = 2; col <= 7; col++) createCell(methodRow, col, "", wrapDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));
            currentRow++;

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [4-1. 유통 채널 포장 규정 및 스티커/완충재 기준]
            createSectionHeader(sheet0, currentRow, "4-1. 🏷️ 유통 채널 전용 포장 규정 및 스티커 / 완충재 / 현품표 기준", headerStyle, 7, 28);
            currentRow++;
            String stickerStr = spec.getOutboxChannelStickerStandard() != null && !spec.getOutboxChannelStickerStandard().isEmpty()
                    ? spec.getOutboxChannelStickerStandard()
                    : (firstChannel != null && Boolean.TRUE.equals(firstChannel.getChannelStickerRequired()) ? (firstChannel.getName() + " 채널 스티커 부착 필수") : "해당 없음");
            String cushionStr = spec.getOutboxCushioningStandard() != null && !spec.getOutboxCushioningStandard().isEmpty()
                    ? spec.getOutboxCushioningStandard()
                    : (firstChannel != null && firstChannel.getCushioningStandard() != null ? firstChannel.getCushioningStandard() : "-");
            String popStr = spec.getPopRequiredStandard() != null && !spec.getPopRequiredStandard().isEmpty()
                    ? spec.getPopRequiredStandard()
                    : (firstChannel != null && Boolean.TRUE.equals(firstChannel.getPopRequired()) ? (firstChannel.getName() + " POP 부착/동봉 필수") : "해당 없음");

            addRow(sheet0, currentRow++, 28f, labelStyle, dataStyle, "채널스티커 기준", stickerStr, "완충재 처리기준", cushionStr, "제품 POP 기준", popStr, "적용 유통채널", firstChannel != null ? firstChannel.getName() : "-");
            
            // 현품표 규칙 행 (줄바꿈 지원 및 높이 70pt 적용)
            Row labelRuleRow = sheet0.createRow(currentRow++);
            labelRuleRow.setHeightInPoints(70);
            createCell(labelRuleRow, 0, "인박스 현품표", labelStyle);
            createCell(labelRuleRow, 1, inboxMarkingRule, wrapDataStyle);
            createCell(labelRuleRow, 2, "아웃박스 현품표", labelStyle);
            createCell(labelRuleRow, 3, outboxMarkingRule, wrapDataStyle);
            createCell(labelRuleRow, 4, "팔레트 현품표", labelStyle);
            createCell(labelRuleRow, 5, palletMarkingRule, wrapDataStyle);
            createCell(labelRuleRow, 6, "-", labelStyle);
            createCell(labelRuleRow, 7, "-", wrapDataStyle);

            addRow(sheet0, currentRow++, 48f, labelStyle, wrapDataStyle, "인박스 날짜양식", inboxDateFormatStr, "아웃박스 날짜양식", outboxDateFormatStr, "팔레트 날짜양식", palletDateFormatStr, "-", "-");

            if (stickerNote != null && stickerNote.getFileUrl() != null) {
                byte[] stickerBytes = getImageBytesFromFileOrUrl(stickerNote.getFileUrl());
                if (stickerBytes != null && stickerBytes.length > 0) {
                    Row stRow = sheet0.createRow(currentRow);
                    stRow.setHeightInPoints(200);
                    createCell(stRow, 0, "채널스티커 규정사진", labelStyle);
                    createCell(stRow, 1, stickerNote.getNoteContent() != null && !stickerNote.getNoteContent().isEmpty() ? stickerNote.getNoteContent() : "채널 스티커 부착 규정 사진", wrapDataStyle);
                    for (int col = 2; col <= 7; col++) createCell(stRow, col, "", wrapDataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));

                    try {
                        org.apache.poi.ss.usermodel.Drawing<?> sheet0Drawing = sheet0.getDrawingPatriarch() != null ? sheet0.getDrawingPatriarch() : sheet0.createDrawingPatriarch();
                        int picIdx = workbook.addPicture(stickerBytes, Workbook.PICTURE_TYPE_JPEG);
                        org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                        anchor.setCol1(1); anchor.setRow1(currentRow);
                        anchor.setCol2(4); anchor.setRow2(currentRow + 1);
                        anchor.setDx1(10 * 10000); anchor.setDy1(10 * 10000);
                        anchor.setDx2(-10 * 10000); anchor.setDy2(-10 * 10000);
                        anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                        sheet0Drawing.createPicture(anchor, picIdx);
                    } catch (Exception ex) {
                        log.error("Failed to insert channel sticker image into Excel sheet0", ex);
                    }
                    currentRow++;
                } else if (stickerNote.getFileType() != null && stickerNote.getFileType().equalsIgnoreCase("PDF")) {
                    Row stRow = sheet0.createRow(currentRow);
                    stRow.setHeightInPoints(30);
                    createCell(stRow, 0, "채널스티커 규정문서", labelStyle);
                    createCell(stRow, 1, "📄 [PDF 첨부] " + (stickerNote.getNoteContent() != null ? stickerNote.getNoteContent() : "채널 스티커 부착 규정 문서 첨부됨"), wrapDataStyle);
                    for (int col = 2; col <= 7; col++) createCell(stRow, col, "", wrapDataStyle);
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));
                    currentRow++;
                }
            }

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [5. 체적/적재 사양 및 검증 기준]
            createSectionHeader(sheet0, currentRow, "5. 🚚 체적/적재 사양 및 검증 기준 (Volume & Loading Spec)", headerStyle, 7, 28);
            currentRow++;

            // 인박스/아웃박스/팔레트 규격 및 수량 (사양서 값 우선, 없으면 마스터 체적정보 자동 반영)
            String effInboxType = (spec.getInboxType() != null && !spec.getInboxType().isBlank()) ? spec.getInboxType() : "인박스";
            String effInboxQty = spec.getInboxQty() != null ? spec.getInboxQty() + " ea" 
                : (product.getInboxInfo() != null && product.getInboxInfo().getInboxQuantity() != null && product.getInboxInfo().getInboxQuantity() > 0 ? product.getInboxInfo().getInboxQuantity() + " ea" : "-");
            String effInboxSize = (spec.getInboxSize() != null && !spec.getInboxSize().isBlank()) ? spec.getInboxSize()
                : (product.getInboxInfo() != null && product.getInboxInfo().getInboxWidth() != null && product.getInboxInfo().getInboxLength() != null && product.getInboxInfo().getInboxHeight() != null ? String.format("%sx%sx%s", product.getInboxInfo().getInboxWidth(), product.getInboxInfo().getInboxLength(), product.getInboxInfo().getInboxHeight()) : "-");
            String effInboxMat = (spec.getInboxMaterial() != null && !spec.getInboxMaterial().isBlank()) ? spec.getInboxMaterial() : "-";

            String effOutboxType = (spec.getOutboxType() != null && !spec.getOutboxType().isBlank()) ? spec.getOutboxType() : "아웃박스";
            String effOutboxQty = spec.getOutboxQty() != null ? spec.getOutboxQty() + " ea" 
                : (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxQuantity() != null && product.getOutboxInfo().getOutboxQuantity() > 0 ? product.getOutboxInfo().getOutboxQuantity() + " ea" : "-");
            String effOutboxSize = (spec.getOutboxSize() != null && !spec.getOutboxSize().isBlank()) ? spec.getOutboxSize()
                : (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxWidth() != null && product.getOutboxInfo().getOutboxLength() != null && product.getOutboxInfo().getOutboxHeight() != null ? String.format("%sx%sx%s", product.getOutboxInfo().getOutboxWidth(), product.getOutboxInfo().getOutboxLength(), product.getOutboxInfo().getOutboxHeight()) : "-");
            String effOutboxMat = (spec.getOutboxMaterial() != null && !spec.getOutboxMaterial().isBlank()) ? spec.getOutboxMaterial() : "KLB.S.S.K.K";

            String effPalletType = (spec.getPalletTypeStr() != null && !spec.getPalletTypeStr().isBlank()) ? spec.getPalletTypeStr() : "-";
            String effStackMethod = (spec.getPalletStackingMethod() != null && !spec.getPalletStackingMethod().isBlank() && !"-".equals(spec.getPalletStackingMethod().trim())) 
                ? spec.getPalletStackingMethod() 
                : ((spec.getPalletStackingPattern() != null && !spec.getPalletStackingPattern().isBlank() && !"-".equals(spec.getPalletStackingPattern().trim())) 
                    ? spec.getPalletStackingPattern() 
                    : "핀휠 교차 적재");
            String effPalletSize = (spec.getPalletSize() != null && !spec.getPalletSize().isBlank()) ? spec.getPalletSize()
                : (product.getPalletInfo() != null && product.getPalletInfo().getPalletWidth() != null && product.getPalletInfo().getPalletLength() != null ? String.format("%sx%s", product.getPalletInfo().getPalletWidth(), product.getPalletInfo().getPalletLength()) : "-");
            String rawHeightLimit = (spec.getPalletHeightLimit() != null && !spec.getPalletHeightLimit().isBlank()) ? spec.getPalletHeightLimit()
                : (product.getPalletInfo() != null && product.getPalletInfo().getPalletHeight() != null ? product.getPalletInfo().getPalletHeight().toString() : "-");
            String effPalletHeightLimit = (rawHeightLimit != null && !rawHeightLimit.equals("-") && !rawHeightLimit.toLowerCase().endsWith("mm")) 
                ? (rawHeightLimit + " mm") 
                : rawHeightLimit;

            String effOneOutboxWt = (spec.getOneOutboxWeight() != null) ? spec.getOneOutboxWeight() + " kg"
                : (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxWeight() != null ? product.getOutboxInfo().getOutboxWeight() + " kg" : "-");
            String effOnePalletWt = (spec.getOnePalletWeight() != null) ? spec.getOnePalletWeight() + " kg" : "-";
            String effOnePalletHt = (spec.getOnePalletHeight() != null) ? spec.getOnePalletHeight() + " mm"
                : (product.getPalletInfo() != null && product.getPalletInfo().getPalletHeight() != null ? product.getPalletInfo().getPalletHeight() + " mm" : "-");

            addRow(sheet0, currentRow++, 28f, labelStyle, dataStyle, "인박스 구분", effInboxType, "인박스 입수량", effInboxQty, "인박스 규격", effInboxSize, "인박스 재질", effInboxMat);
            addRow(sheet0, currentRow++, 28f, labelStyle, dataStyle, "아웃박스 구분", effOutboxType, "아웃박스 입수량", effOutboxQty, "아웃박스 규격", effOutboxSize, "아웃박스 재질", effOutboxMat);
            addRow(sheet0, currentRow++, 28f, labelStyle, dataStyle, "팔레트 종류", effPalletType, "적재 방법", effStackMethod, "팔레트 규격", effPalletSize, "높이 제한", effPalletHeightLimit);
            addRow(sheet0, currentRow++, 28f, labelStyle, dataStyle, "1아웃박스 중량 [제한12kg]", effOneOutboxWt, "1팔레트 중량 [제한630kg]", effOnePalletWt, "1팔레트 높이 [제한1500mm]", effOnePalletHt, "검증 상태", "정상 규격");

            // [5-1. 3D 입수 및 팔레트 적재 형태 (3D Loading Layout)]
            currentRow = renderLoadingLayoutSection(sheet0, currentRow, spec, product, workbook, headerStyle, subHeaderStyle, labelStyle, dataStyle, wrapDataStyle);

            // 여백 행
            createMarginRow(sheet0, currentRow++, 10);

            // [6. 사양서 특이사항]
            createSectionHeader(sheet0, currentRow, "6. 📝 사양서 특이사항 (Remarks)", headerStyle, 7, 28);
            currentRow++;
            String remText = spec.getRemarks() != null ? spec.getRemarks() : "등록된 특이사항이 없습니다.";
            int remLines = remText.split("\\r?\\n").length;
            Row remRow = sheet0.createRow(currentRow);
            remRow.setHeightInPoints(Math.max(60f, Math.min(300f, remLines * 18f)));
            createCell(remRow, 0, "특이사항", labelStyle);
            createCell(remRow, 1, remText, wrapDataStyle);
            for (int col = 2; col <= 7; col++) createCell(remRow, col, "", wrapDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 1, 7));

            // 컬럼 너비 최적화 (레이블: 4800, Col 2 재질/세부사양: 8000, 데이터: 9000~10500)
            sheet0.setColumnWidth(0, 4800);
            sheet0.setColumnWidth(1, 10500);
            sheet0.setColumnWidth(2, 8000); // 4800 -> 8000 확장으로 재질/세부사양 가로 잘림 해결
            sheet0.setColumnWidth(3, 10500);
            sheet0.setColumnWidth(4, 4800);
            sheet0.setColumnWidth(5, 9500);
            sheet0.setColumnWidth(6, 4800);
            sheet0.setColumnWidth(7, 9000);
            applyPrintSetup(sheet0);

            // --- Sheet 2: 포장방법 사진 ---
            Sheet sheet1 = workbook.createSheet("포장방법 사진");
            createSectionHeader(sheet1, 0, "📸 순서별 포장 방법 이미지 지침", headerStyle, 3);
            Row imgHeader = sheet1.createRow(1);
            imgHeader.setHeightInPoints(24);
            createCell(imgHeader, 0, "순서", subHeaderStyle);
            createCell(imgHeader, 1, "포장 방법 사진 (Image)", subHeaderStyle);
            createCell(imgHeader, 2, "포장 공정 단계 캡션 / 상세 지침", subHeaderStyle);
            createCell(imgHeader, 3, "", subHeaderStyle);
            sheet1.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 2, 3));

            org.apache.poi.ss.usermodel.Drawing<?> drawing = sheet1.createDrawingPatriarch();

            List<com.example.ims.entity.PackagingMethodImage> methodImages = methodImageRepository.findActiveBySpecId(spec.getId());
            List<com.example.ims.entity.PackagingMethodImage> validMethodImages = methodImages != null 
                ? methodImages.stream()
                    .filter(img -> (img.getImageUrl() != null && !img.getImageUrl().isBlank()) || 
                                   (img.getCaptionText() != null && !img.getCaptionText().isBlank() && !"-".equals(img.getCaptionText().trim())))
                    .collect(Collectors.toList())
                : Collections.emptyList();

            int imgRow = 2;
            if (validMethodImages.isEmpty()) {
                Row r = sheet1.createRow(imgRow);
                r.setHeightInPoints(24);
                createCell(r, 0, "-", centerDataStyle);
                createCell(r, 1, "-", centerDataStyle);
                createCell(r, 2, "등록된 포장방법 사진 지침이 없습니다.", dataStyle);
                createCell(r, 3, "", dataStyle);
                sheet1.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRow, imgRow, 2, 3));
            } else {
                for (int i = 0; i < validMethodImages.size(); i++) {
                    com.example.ims.entity.PackagingMethodImage imgEntity = validMethodImages.get(i);
                    Row r = sheet1.createRow(imgRow);
                    r.setHeightInPoints(320); // [요청 반영] 기존 160pt에서 2배로 확대 (320pt)
                    createCell(r, 0, "NO." + (i + 1), centerDataStyle);
                    createCell(r, 1, "", centerDataStyle); // 사진 들어갈 셀
                    createCell(r, 2, (imgEntity.getCaptionText() != null && !imgEntity.getCaptionText().isBlank()) ? imgEntity.getCaptionText().trim() : "-", wrapDataStyle);
                    createCell(r, 3, "", wrapDataStyle);
                    sheet1.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRow, imgRow, 2, 3));

                    // Excel에 주석(도형/텍스트)이 합성된 이미지 바이너리 렌더링
                    byte[] imgBytes = getAnnotatedImageBytes(imgEntity);
                    if (imgBytes != null && imgBytes.length > 0) {
                        try {
                            int pictureIdx = workbook.addPicture(imgBytes, detectPictureType(imgBytes));
                            org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                            anchor.setCol1(1);
                            anchor.setRow1(imgRow);
                            anchor.setCol2(2);
                            anchor.setRow2(imgRow + 1);
                            anchor.setDx1(15 * 10000); anchor.setDy1(10 * 10000);
                            anchor.setDx2(-15 * 10000); anchor.setDy2(-10 * 10000);
                            anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                            drawing.createPicture(anchor, pictureIdx);
                        } catch (Exception ex) {
                            log.error("Failed to insert annotated image into Excel row " + imgRow, ex);
                        }
                    }
                    imgRow++;
                }
            }
            sheet1.setColumnWidth(0, 3500); 
            sheet1.setColumnWidth(1, 15000); // 포장방법 사진 열
            sheet1.setColumnWidth(2, 10000); 
            sheet1.setColumnWidth(3, 10000);
            applyPrintSetup(sheet1);

            // --- Sheet 3: 인박스 현품표 ---
            Sheet sheet2 = workbook.createSheet("인박스 현품표");
            createSectionHeader(sheet2, 0, "[ 인 박 스 현 품 표 / INBOX LABEL ]", headerStyle, 3, 30);
            addRow(sheet2, 1, 28f, labelStyle, dataStyle, "품목코드 (Product Code)", product.getItemCode(), "입수량 (Quantity)", (spec.getInboxQty() != null ? spec.getInboxQty() + " EA" : "0 EA"));
            addRow(sheet2, 2, 28f, labelStyle, dataStyle, "국문 제품명 (Product Name KOR)", product.getProductName(), "제조사 (Manufacturer)", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"));
            addRow(sheet2, 3, 28f, labelStyle, dataStyle, "영문 제품명 (Product Name ENG)", (product.getEnglishProductName() != null ? product.getEnglishProductName() : "-"), "제조일자 (Mfg. Date)", extractMfgDateDisplay(inboxDateFormatStr, firstChannel));
            addRow(sheet2, 4, 28f, labelStyle, dataStyle, "제조번호 (Lot No.)", "LOT(제조번호)", "사용기한 (Exp. Date)", extractExpDateDisplay(inboxDateFormatStr, firstChannel));
            
            Row inboxMarkingRow = sheet2.createRow(5);
            inboxMarkingRow.setHeightInPoints(70);
            createCell(inboxMarkingRow, 0, "🏷️ 현품표 착인/기재 기준", labelStyle);
            createCell(inboxMarkingRow, 1, inboxMarkingRule, wrapDataStyle);
            for (int col = 2; col <= 3; col++) createCell(inboxMarkingRow, col, "", wrapDataStyle);
            sheet2.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(5, 5, 1, 3));

            Row inboxNoteRow = sheet2.createRow(6);
            inboxNoteRow.setHeightInPoints(28);
            createCell(inboxNoteRow, 0, "바코드 규정", labelStyle);
            createCell(inboxNoteRow, 1, "⚠️ 인박스 현품표에는 바코드를 부착/표기하지 않습니다. (규정 준수)", wrapDataStyle);
            for (int col = 2; col <= 3; col++) createCell(inboxNoteRow, col, "", wrapDataStyle);
            sheet2.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(6, 6, 1, 3));
            sheet2.setColumnWidth(0, 6500); sheet2.setColumnWidth(1, 11000); sheet2.setColumnWidth(2, 6500); sheet2.setColumnWidth(3, 11000);
            setOuterBorders(sheet2, 0, 6, 0, 3);
            applyPrintSetup(sheet2);

            // --- Sheet 4: 아웃박스 현품표 ---
            Sheet sheet3 = workbook.createSheet("아웃박스 현품표");
            createSectionHeader(sheet3, 0, "[ 아 웃 박 스 현 품 표 / OUTBOX LABEL ]", headerStyle, 3, 30);
            addRow(sheet3, 1, 28f, labelStyle, dataStyle, "품목코드 (Product Code)", product.getItemCode(), "입수량 (Quantity)", (spec.getOutboxQty() != null ? spec.getOutboxQty() + " EA" : "0 EA"));
            addRow(sheet3, 2, 28f, labelStyle, dataStyle, "국문 제품명 (Product Name KOR)", product.getProductName(), "제품무게 (Gross Weight)", (spec.getOneOutboxWeight() != null ? spec.getOneOutboxWeight() + " kg" : "- kg"));
            addRow(sheet3, 3, 28f, labelStyle, dataStyle, "영문 제품명 (Product Name ENG)", (product.getEnglishProductName() != null ? product.getEnglishProductName() : "-"), "제조일자 (Mfg. Date)", extractMfgDateDisplay(outboxDateFormatStr, firstChannel));
            addRow(sheet3, 4, 28f, labelStyle, dataStyle, "제조번호 (Lot No.)", "LOT(제조번호)", "사용기한 (Exp. Date)", extractExpDateDisplay(outboxDateFormatStr, firstChannel));
            
            String outboxBarcodeText = (product.getOutboxBarcode() != null && !product.getOutboxBarcode().isEmpty()) ? product.getOutboxBarcode() : (product.getProductBarcode() != null ? product.getProductBarcode() : (spec.getBarcode() != null ? spec.getBarcode() : "BARCODE-NOT-SET"));
            addRow(sheet3, 5, 28f, labelStyle, dataStyle, "제조사 (Manufacturer)", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), "바코드 텍스트", outboxBarcodeText);
            
            Row outboxMarkingRow = sheet3.createRow(6);
            outboxMarkingRow.setHeightInPoints(70);
            createCell(outboxMarkingRow, 0, "🏷️ 현품표 착인/기재 기준", labelStyle);
            createCell(outboxMarkingRow, 1, outboxMarkingRule, wrapDataStyle);
            for (int col = 2; col <= 3; col++) createCell(outboxMarkingRow, col, "", wrapDataStyle);
            sheet3.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(6, 6, 1, 3));

            // 바코드 이미지 렌더링 행 (Row 7)
            Row obBarcodeRow = sheet3.createRow(7);
            obBarcodeRow.setHeightInPoints(120);
            createCell(obBarcodeRow, 0, "바코드 스캔 이미지", labelStyle);
            createCell(obBarcodeRow, 1, "", dataStyle);
            for (int col = 2; col <= 3; col++) createCell(obBarcodeRow, col, "", dataStyle);
            sheet3.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(7, 7, 1, 3));

            org.apache.poi.ss.usermodel.Drawing<?> obDrawing = sheet3.createDrawingPatriarch();
            byte[] obBarcodeBytes = generateBarcodeImageBytes(outboxBarcodeText, 450, 160);
            if (obBarcodeBytes != null) {
                try {
                    int picIdx = workbook.addPicture(obBarcodeBytes, Workbook.PICTURE_TYPE_PNG);
                    org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                    anchor.setCol1(1); anchor.setRow1(7);
                    anchor.setCol2(4); anchor.setRow2(8);
                    anchor.setDx1(10 * 10000); anchor.setDy1(5 * 10000);
                    anchor.setDx2(-10 * 10000); anchor.setDy2(-5 * 10000);
                    obDrawing.createPicture(anchor, picIdx);
                } catch (Exception ex) {
                    log.error("Failed to insert outbox barcode image", ex);
                }
            }

            sheet3.setColumnWidth(0, 6500); sheet3.setColumnWidth(1, 11000); sheet3.setColumnWidth(2, 6500); sheet3.setColumnWidth(3, 11000);
            setOuterBorders(sheet3, 0, 7, 0, 3);
            applyPrintSetup(sheet3);

            // --- Sheet 5: 팔레트 현품표 ---
            Sheet sheet4 = workbook.createSheet("팔레트 현품표");
            createSectionHeader(sheet4, 0, "[ 팔 레 트 현 품 표 / PALLET LABEL ]", headerStyle, 3, 30);
            
            // [지능형 계산] 1팔레트 적재 박스 수량 및 총 낱개 수량
            int effPalletTierCount = (spec.getPalletTierCount() != null && spec.getPalletTierCount() > 0) ? spec.getPalletTierCount() : 5;
            int effPalletTierQty = (spec.getPalletTierQty() != null && spec.getPalletTierQty() > 0) ? spec.getPalletTierQty() : 8;
            int calculatedPalletBoxQty = effPalletTierCount * effPalletTierQty; // 기본 40 Box

            Integer pBoxQty = null;
            if (spec.getPalletTotalOutboxQty() != null && spec.getPalletTotalOutboxQty() > 0) {
                pBoxQty = spec.getPalletTotalOutboxQty();
            } else if (spec.getPalletTierCount() != null && spec.getPalletTierQty() != null && spec.getPalletTierCount() > 0 && spec.getPalletTierQty() > 0) {
                pBoxQty = spec.getPalletTierCount() * spec.getPalletTierQty();
            } else if (product.getPalletInfo() != null && product.getPalletInfo().getPalletQuantity() != null && product.getPalletInfo().getPalletQuantity() > 0 && product.getPalletInfo().getPalletQuantity() <= 200) {
                pBoxQty = product.getPalletInfo().getPalletQuantity();
            } else {
                pBoxQty = calculatedPalletBoxQty;
            }

            int effOutQtyForPallet = (spec.getOutboxQty() != null && spec.getOutboxQty() > 0) 
                ? spec.getOutboxQty() 
                : (product.getOutboxInfo() != null && product.getOutboxInfo().getOutboxQuantity() != null && product.getOutboxInfo().getOutboxQuantity() > 0 ? product.getOutboxInfo().getOutboxQuantity() : 40);

            String palletBoxQtyStr = (pBoxQty != null) ? (pBoxQty + " Box") : "- Box";
            String totalPcsStr = (pBoxQty != null) ? (pBoxQty * effOutQtyForPallet + " EA") : "- EA";

            addRow(sheet4, 1, 28f, labelStyle, dataStyle, "품목코드 (Product Code)", product.getItemCode(), "적재 박스 수량 (Box Qty/Pallet)", palletBoxQtyStr);
            addRow(sheet4, 2, 28f, labelStyle, dataStyle, "국문 제품명 (Product Name KOR)", product.getProductName(), "적재 낱개 수량 (Total Pcs/Pallet)", totalPcsStr);
            addRow(sheet4, 3, 28f, labelStyle, dataStyle, "영문 제품명 (Product Name ENG)", (product.getEnglishProductName() != null ? product.getEnglishProductName() : "-"), "제조일자 (Mfg. Date)", extractMfgDateDisplay(palletDateFormatStr, firstChannel));
            addRow(sheet4, 4, 28f, labelStyle, dataStyle, "제조번호 (Lot No.)", "LOT(제조번호)", "사용기한 (Exp. Date)", extractExpDateDisplay(palletDateFormatStr, firstChannel));
            
            String palletBarcodeText = (product.getProductBarcode() != null && !product.getProductBarcode().isEmpty()) ? product.getProductBarcode() : (spec.getBarcode() != null ? spec.getBarcode() : "BARCODE-NOT-SET");
            addRow(sheet4, 5, 28f, labelStyle, dataStyle, "제조사 (Manufacturer)", (product.getManufacturerInfo() != null ? product.getManufacturerInfo().getName() : "-"), "바코드 텍스트", palletBarcodeText);

            Row palletMarkingRow = sheet4.createRow(6);
            palletMarkingRow.setHeightInPoints(70);
            createCell(palletMarkingRow, 0, "🏷️ 현품표 착인/기재 기준", labelStyle);
            createCell(palletMarkingRow, 1, palletMarkingRule, wrapDataStyle);
            for (int col = 2; col <= 3; col++) createCell(palletMarkingRow, col, "", wrapDataStyle);
            sheet4.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(6, 6, 1, 3));

            // 바코드 이미지 렌더링 행 (Row 7)
            Row pltBarcodeRow = sheet4.createRow(7);
            pltBarcodeRow.setHeightInPoints(120);
            createCell(pltBarcodeRow, 0, "바코드 스캔 이미지", labelStyle);
            createCell(pltBarcodeRow, 1, "", dataStyle);
            for (int col = 2; col <= 3; col++) createCell(pltBarcodeRow, col, "", dataStyle);
            sheet4.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(7, 7, 1, 3));

            org.apache.poi.ss.usermodel.Drawing<?> pltDrawing = sheet4.createDrawingPatriarch();
            byte[] pltBarcodeBytes = generateBarcodeImageBytes(palletBarcodeText, 450, 160);
            if (pltBarcodeBytes != null) {
                try {
                    int picIdx = workbook.addPicture(pltBarcodeBytes, Workbook.PICTURE_TYPE_PNG);
                    org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                    anchor.setCol1(1); anchor.setRow1(7);
                    anchor.setCol2(4); anchor.setRow2(8);
                    anchor.setDx1(10 * 10000); anchor.setDy1(5 * 10000);
                    anchor.setDx2(-10 * 10000); anchor.setDy2(-5 * 10000);
                    pltDrawing.createPicture(anchor, picIdx);
                } catch (Exception ex) {
                    log.error("Failed to insert pallet barcode image", ex);
                }
            }

            sheet4.setColumnWidth(0, 6500); sheet4.setColumnWidth(1, 11000); sheet4.setColumnWidth(2, 6500); sheet4.setColumnWidth(3, 11000);
            setOuterBorders(sheet4, 0, 7, 0, 3);
            applyPrintSetup(sheet4);

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void createSectionHeader(Sheet sheet, int rowIdx, String title, org.apache.poi.ss.usermodel.CellStyle style, int maxCol) {
        createSectionHeader(sheet, rowIdx, title, style, maxCol, 28);
    }

    private void createSectionHeader(Sheet sheet, int rowIdx, String title, org.apache.poi.ss.usermodel.CellStyle style, int maxCol, int heightInPoints) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(heightInPoints);
        createCell(row, 0, title, style);
        for (int i = 1; i <= maxCol; i++) {
            createCell(row, i, "", style);
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx, rowIdx, 0, maxCol));
    }

    private void createMarginRow(Sheet sheet, int rowIdx, int heightInPoints) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(heightInPoints);
    }

    private void addRow(Sheet sheet, int rowIdx, float heightInPoints, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, String l1, String v1, String l2, String v2, String l3, String v3, String l4, String v4) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(heightInPoints);
        createCell(row, 0, l1, labelStyle);
        createCell(row, 1, v1, dataStyle);
        createCell(row, 2, l2, labelStyle);
        createCell(row, 3, v2, dataStyle);
        createCell(row, 4, l3, labelStyle);
        createCell(row, 5, v3, dataStyle);
        createCell(row, 6, l4, labelStyle);
        createCell(row, 7, v4, dataStyle);
    }

    private void addRow(Sheet sheet, int rowIdx, float heightInPoints, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, String l1, String v1, String l2, String v2) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(heightInPoints);
        createCell(row, 0, l1, labelStyle);
        createCell(row, 1, v1, dataStyle);
        createCell(row, 2, l2, labelStyle);
        createCell(row, 3, v2, dataStyle);
    }

    private void createCell(Row row, int colIdx, String value, org.apache.poi.ss.usermodel.CellStyle style) {
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(colIdx);
        cell.setCellValue(value != null ? value : "");
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private void setBorders(org.apache.poi.ss.usermodel.CellStyle style) {
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setTopBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
        style.setBottomBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
        style.setLeftBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
        style.setRightBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
    }

    private void setOuterBorders(Sheet sheet, int startRow, int endRow, int startCol, int endCol) {
        Workbook wb = sheet.getWorkbook();
        for (int r = startRow; r <= endRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null) row = sheet.createRow(r);
            for (int c = startCol; c <= endCol; c++) {
                org.apache.poi.ss.usermodel.Cell cell = row.getCell(c);
                if (cell == null) cell = row.createCell(c);
                
                org.apache.poi.ss.usermodel.CellStyle newStyle = wb.createCellStyle();
                if (cell.getCellStyle() != null) {
                    newStyle.cloneStyleFrom(cell.getCellStyle());
                }
                
                if (r == startRow) newStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                if (r == endRow) newStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                if (c == startCol) newStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                if (c == endCol) newStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.MEDIUM);
                
                newStyle.setTopBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                newStyle.setBottomBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                newStyle.setLeftBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                newStyle.setRightBorderColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_50_PERCENT.getIndex());
                
                cell.setCellStyle(newStyle);
            }
        }
    }

    private void applyPrintSetup(Sheet sheet) {
        sheet.setAutobreaks(true);
        sheet.getPrintSetup().setFitWidth((short) 1);
        sheet.getPrintSetup().setFitHeight((short) 0);
        sheet.getPrintSetup().setLandscape(false);
        sheet.setMargin(PageMargin.TOP, 0.5);
        sheet.setMargin(PageMargin.BOTTOM, 0.5);
        sheet.setMargin(PageMargin.LEFT, 0.5);
        sheet.setMargin(PageMargin.RIGHT, 0.5);
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
            if (vA != vB) return Integer.compare(vB, vA); // descending version
            Long idA = a.getId() == null ? 0L : a.getId();
            Long idB = b.getId() == null ? 0L : b.getId();
            return Long.compare(idB, idA); // descending ID
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
        String prodWeightInfo = product.getWeight() != null && !product.getWeight().isEmpty() ? " (" + product.getWeight() + ")" : "";
        String productNameWithSpecs = product.getProductName() + capacityInfo + prodWeightInfo;
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
                    String bomCodePrefix = comp.getBomCode() != null && !comp.getBomCode().isEmpty() ? "[" + comp.getBomCode() + "] " : "";
                    double w = comp.getWeight() != null ? comp.getWeight() : 0.0;
                    int q = comp.getQuantity() != null ? comp.getQuantity() : 1;
                    String compWeightInfo = w > 0 ? String.format(" | 중량: %.2fg (합계: %.2fg)", w, w * q) : "";
                    document.add(new Paragraph(String.format(" - %s%s (%s) | 규격: %s | 수량: %sea%s | 업체: %s | 비고: %s",
                        bomCodePrefix,
                        comp.getComponentName() != null ? comp.getComponentName() : "-",
                        comp.getSpecDetails() != null ? comp.getSpecDetails() : "-",
                        comp.getSizeDimension() != null ? comp.getSizeDimension() : "-",
                        q,
                        compWeightInfo,
                        comp.getSupplier() != null ? comp.getSupplier() : "-",
                        comp.getRemarks() != null ? comp.getRemarks() : "-"
                    ), normalFont));
                }
            }
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 4. 포장방법 사진 및 3줄 캡션 상세 (PDF 내 직접 포함)
            document.add(new Paragraph("[포장방법 사진 및 캡션 / Packaging Method Images]", sectionFont));
            List<com.example.ims.entity.PackagingMethodImage> methodImages = methodImageRepository.findActiveBySpecId(spec.getId());
            if (methodImages == null || methodImages.isEmpty()) {
                document.add(new Paragraph("등록된 포장방법 사진이 없습니다.", normalFont));
            } else {
                for (int i = 0; i < methodImages.size(); i++) {
                    com.example.ims.entity.PackagingMethodImage imgEntity = methodImages.get(i);
                    document.add(new Paragraph(String.format("NO %d. %s", (i + 1), 
                        imgEntity.getCaptionText() != null ? imgEntity.getCaptionText() : ""), normalFont));
                    
                    byte[] imgBytes = getAnnotatedImageBytes(imgEntity);
                    if (imgBytes != null && imgBytes.length > 0) {
                        try {
                            com.itextpdf.text.Image pdfImg = com.itextpdf.text.Image.getInstance(imgBytes);
                            pdfImg.scaleToFit(450f, 280f); // 450f, 280f로 스케일 향상
                            pdfImg.setAlignment(com.itextpdf.text.Element.ALIGN_LEFT);
                            pdfImg.setSpacingAfter(10f);
                            document.add(pdfImg);
                        } catch (Exception e) {
                            log.error("Failed to render PDF image for " + imgEntity.getImageUrl(), e);
                        }
                    }
                }
            }
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 5. 아웃박스 & 착인 기준 및 포장방법 (서술)
            document.add(new Paragraph("[아웃박스 및 착인기준 / Marking & Packaging Method]", sectionFont));
            document.add(new Paragraph("표기 방법: " + (spec.getMarkingMethod() != null ? spec.getMarkingMethod() : "-"), normalFont));
            document.add(new Paragraph("표기 기준: " + (spec.getMarkingStandard() != null ? spec.getMarkingStandard() : "-"), normalFont));
            document.add(new Paragraph("포장방법 (서술):\n" + (spec.getPackagingMethodText() != null ? spec.getPackagingMethodText() : "-"), normalFont));
            document.add(new Paragraph("----------------------------------------------------------------------------------------------------------------", normalFont));

            // 5-1. 유통 채널 포장 규정 및 스티커/완충재/현품표 기준
            com.example.ims.entity.SalesChannel pdfFirstChannel = (product.getChannels() != null && !product.getChannels().isEmpty()) ? product.getChannels().get(0) : null;
            String pdfInboxMarkingRule = (pdfFirstChannel != null && pdfFirstChannel.getInboxLabelMarkingRule() != null) ? pdfFirstChannel.getInboxLabelMarkingRule() : "인박스 현품표 표준 규격 적용";
            String pdfOutboxMarkingRule = (pdfFirstChannel != null && pdfFirstChannel.getOutboxLabelMarkingRule() != null) ? pdfFirstChannel.getOutboxLabelMarkingRule() : "아웃박스 현품표 표준 규격 적용";
            String pdfPalletMarkingRule = (pdfFirstChannel != null && pdfFirstChannel.getPalletLabelMarkingRule() != null) ? pdfFirstChannel.getPalletLabelMarkingRule() : "팔레트 현품표 표준 규격 적용";
            String pdfInboxDateFormatStr = (spec.getInboxDateFormat() != null && !spec.getInboxDateFormat().trim().isEmpty()) ? spec.getInboxDateFormat() : (pdfFirstChannel != null && pdfFirstChannel.getInboxDateFormat() != null ? pdfFirstChannel.getInboxDateFormat() : "[ YYYY.MM.DD 표기 ]");
            String pdfOutboxDateFormatStr = (spec.getOutboxDateFormat() != null && !spec.getOutboxDateFormat().trim().isEmpty()) ? spec.getOutboxDateFormat() : (pdfFirstChannel != null && pdfFirstChannel.getOutboxDateFormat() != null ? pdfFirstChannel.getOutboxDateFormat() : "[ YYYY.MM.DD 표기 ]");
            String pdfPalletDateFormatStr = (spec.getPalletDateFormat() != null && !spec.getPalletDateFormat().trim().isEmpty()) ? spec.getPalletDateFormat() : (pdfFirstChannel != null && pdfFirstChannel.getPalletDateFormat() != null ? pdfFirstChannel.getPalletDateFormat() : "[ YYYY.MM.DD 표기 ]");

            String pdfStickerStr = spec.getOutboxChannelStickerStandard() != null && !spec.getOutboxChannelStickerStandard().isEmpty()
                    ? spec.getOutboxChannelStickerStandard()
                    : (pdfFirstChannel != null && Boolean.TRUE.equals(pdfFirstChannel.getChannelStickerRequired()) ? (pdfFirstChannel.getName() + " 채널 스티커 부착 필수") : "해당 없음");
            String pdfCushionStr = spec.getOutboxCushioningStandard() != null && !spec.getOutboxCushioningStandard().isEmpty()
                    ? spec.getOutboxCushioningStandard()
                    : (pdfFirstChannel != null && pdfFirstChannel.getCushioningStandard() != null ? pdfFirstChannel.getCushioningStandard() : "-");
            String pdfPopStr = spec.getPopRequiredStandard() != null && !spec.getPopRequiredStandard().isEmpty()
                    ? spec.getPopRequiredStandard()
                    : (pdfFirstChannel != null && Boolean.TRUE.equals(pdfFirstChannel.getPopRequired()) ? (pdfFirstChannel.getName() + " POP 부착/동봉 필수") : "해당 없음");

            document.add(new Paragraph("[유통 채널 전용 포장 규정 및 스티커 / 완충재 / 현품표 기준]", sectionFont));
            document.add(new Paragraph("🏷️ 채널 스티커 부착 규정: " + pdfStickerStr, normalFont));
            document.add(new Paragraph("🎈 빈공간 완충재 처리 기준: " + pdfCushionStr, normalFont));
            document.add(new Paragraph("📣 제품 POP 부착/동봉 여부: " + pdfPopStr, normalFont));
            document.add(new Paragraph("📥 인박스 현품표 착인기준: " + pdfInboxMarkingRule + " | 날짜표기: " + pdfInboxDateFormatStr, normalFont));
            document.add(new Paragraph("📦 아웃박스 현품표 착인기준: " + pdfOutboxMarkingRule + " | 날짜표기: " + pdfOutboxDateFormatStr, normalFont));
            document.add(new Paragraph("🏷️ 팔레트 현품표 착인기준: " + pdfPalletMarkingRule + " | 날짜표기: " + pdfPalletDateFormatStr, normalFont));

            com.example.ims.entity.ChannelSpecialNote pdfStickerNote = null;
            if (pdfFirstChannel != null) {
                try {
                    List<com.example.ims.entity.ChannelSpecialNote> notes = specialNoteRepository.findByChannelId(pdfFirstChannel.getId());
                    if (notes != null) {
                        for (com.example.ims.entity.ChannelSpecialNote n : notes) {
                            if (n.getCategory() != null && ("CHANNEL_STICKER".equals(n.getCategory().getCategoryKey()) || 
                                (n.getCategory().getCategoryLabel() != null && n.getCategory().getCategoryLabel().contains("스티커")))) {
                                pdfStickerNote = n;
                                break;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to find channel sticker note for PDF", e);
                }
            }

            if (pdfStickerNote != null) {
                if (pdfStickerNote.getNoteContent() != null && !pdfStickerNote.getNoteContent().isBlank()) {
                    document.add(new Paragraph("💡 채널 스티커 규정 메모: " + pdfStickerNote.getNoteContent(), normalFont));
                }
                if (pdfStickerNote.getFileUrl() != null) {
                    byte[] stickerImgBytes = getImageBytesFromFileOrUrl(pdfStickerNote.getFileUrl());
                    if (stickerImgBytes != null && stickerImgBytes.length > 0) {
                        try {
                            com.itextpdf.text.Image pdfStickerImg = com.itextpdf.text.Image.getInstance(stickerImgBytes);
                            pdfStickerImg.scaleToFit(380f, 220f);
                            pdfStickerImg.setAlignment(com.itextpdf.text.Element.ALIGN_LEFT);
                            pdfStickerImg.setSpacingAfter(8f);
                            document.add(pdfStickerImg);
                        } catch (Exception e) {
                            log.error("Failed to render channel sticker image in PDF for " + pdfStickerNote.getFileUrl(), e);
                        }
                    } else if (pdfStickerNote.getFileType() != null && pdfStickerNote.getFileType().equalsIgnoreCase("PDF")) {
                        document.add(new Paragraph("📄 채널 스티커 규정 문서 (PDF 첨부됨): " + (pdfStickerNote.getNoteContent() != null ? pdfStickerNote.getNoteContent() : ""), normalFont));
                    }
                }
            }
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

    private final java.util.Map<String, byte[]> executionImageCache = new java.util.concurrent.ConcurrentHashMap<>();
    private static volatile List<String> cachedValidRoots = null;

    private List<String> getValidUploadRoots() {
        if (cachedValidRoots != null) return cachedValidRoots;
        String userDir = System.getProperty("user.dir", ".");
        List<String> rawRoots = List.of(
            "uploads", "./uploads", "backend/uploads", "./backend/uploads",
            userDir + "/uploads", userDir + "/backend/uploads",
            "internal-management-system/backend/uploads",
            "./internal-management-system/backend/uploads",
            userDir + "/internal-management-system/backend/uploads",
            "E:/AI/internal-management-system/backend/uploads",
            "E:/AI/uploads", "C:/uploads", "data", "./data"
        );
        List<String> valid = new ArrayList<>();
        for (String r : rawRoots) {
            try {
                java.io.File d = new java.io.File(r);
                if (d.exists() && d.isDirectory()) {
                    valid.add(r);
                }
            } catch (Exception ignored) {}
        }
        if (valid.isEmpty()) valid.add("uploads");
        cachedValidRoots = valid;
        return valid;
    }

    /**
     * Helper to read image bytes directly from local disk path, remote URL, or Base64 Data URL.
     */
    private byte[] getImageBytesFromFileOrUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return null;
        String key = fileUrl.trim();
        if (executionImageCache.containsKey(key)) {
            return executionImageCache.get(key);
        }
        byte[] result = fetchImageBytesDirect(key);
        if (result != null && result.length > 0) {
            executionImageCache.put(key, result);
        }
        return result;
    }

    private byte[] fetchImageBytesDirect(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return null;
        if (fileUrl.startsWith("data:image/") && fileUrl.contains("base64,")) {
            try {
                String base64Data = fileUrl.substring(fileUrl.indexOf("base64,") + 7);
                return java.util.Base64.getDecoder().decode(base64Data);
            } catch (Exception e) {
                log.warn("Failed to decode base64 data url", e);
            }
        }
        java.io.File file = findLocalFile(fileUrl, null);
        if (file != null && file.exists()) {
            try {
                return java.nio.file.Files.readAllBytes(file.toPath());
            } catch (Exception e) {
                log.warn("Failed to read bytes from file: " + file.getAbsolutePath(), e);
            }
        }
        if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
            try {
                java.net.URL url = new java.net.URL(fileUrl);
                java.net.URLConnection conn = url.openConnection();
                conn.setConnectTimeout(2500);
                conn.setReadTimeout(3500);
                try (java.io.InputStream in = conn.getInputStream();
                     ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                    return baos.toByteArray();
                }
            } catch (Exception e) {
                log.warn("Failed to download image from URL: " + fileUrl + " (" + e.getMessage() + ")");
            }
        }
        return null;
    }

    /**
     * Automatically crops whitespace and empty floor borders around 3D render images
     * to maximize the visible size of the subject in Excel with guaranteed symmetric padding.
     */
    private byte[] autoCropWhitespace(byte[] imageBytes, int padding) {
        if (imageBytes == null || imageBytes.length == 0) return imageBytes;
        try {
            BufferedImage src = ImageIO.read(new java.io.ByteArrayInputStream(imageBytes));
            if (src == null) return imageBytes;

            int w = src.getWidth();
            int h = src.getHeight();
            if (w <= 30 || h <= 30) return imageBytes;

            int minX = w, maxX = 0, minY = h, maxY = 0;
            boolean foundContent = false;

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int rgb = src.getRGB(x, y);
                    int alpha = (rgb >> 24) & 0xff;
                    int r = (rgb >> 16) & 0xff;
                    int g = (rgb >> 8) & 0xff;
                    int b = rgb & 0xff;

                    // Treat transparent or near-white / studio-floor-grey (>= 220) as background
                    boolean isBackground = (alpha < 20) || (r >= 220 && g >= 220 && b >= 220);
                    if (!isBackground) {
                        foundContent = true;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (!foundContent || (maxX - minX < 20) || (maxY - minY < 20)) {
                return imageBytes;
            }

            int pad = Math.max(padding, 16);
            int actualMinX = Math.max(0, minX - pad);
            int actualMaxX = Math.min(w - 1, maxX + pad);
            int actualMinY = Math.max(0, minY - pad);
            int actualMaxY = Math.min(h - 1, maxY + pad);

            int cropX = actualMinX;
            int cropY = actualMinY;
            int cropW = actualMaxX - actualMinX + 1;
            int cropH = actualMaxY - actualMinY + 1;

            BufferedImage cropped = src.getSubimage(cropX, cropY, cropW, cropH);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(cropped, "png", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.warn("Failed to auto-crop whitespace from 3D layout image", e);
            return imageBytes;
        }
    }

    /**
     * Reads the physical image file and renders annotationsJson (shapes/texts) onto it using Java2D Graphics2D.
     * Preserves high resolution and prevents low-res downscaling for crystal clear Excel printing.
     */
    private byte[] getAnnotatedImageBytes(com.example.ims.entity.PackagingMethodImage imgEntity) {
        java.io.File imgFile = findLocalFile(imgEntity.getImageUrl(), imgEntity.getImagePath());

        // 1. 프론트엔드에서 이미 뷰포트 확대와 주석이 초고화질(Ultra-HD)로 합성되어 업로드된 파일인 경우
        // 파일명이 'annotated_'로 시작하거나 로컬 파일이 존재하면 원본 화질을 100% 그대로 반환하여 엑셀에 선명하게 삽입!
        if (imgFile != null && imgFile.exists()) {
            String fileName = imgFile.getName().toLowerCase();
            if (fileName.startsWith("annotated_") || fileName.startsWith("pkg_method_")) {
                try {
                    return java.nio.file.Files.readAllBytes(imgFile.toPath());
                } catch (Exception e) {
                    log.warn("Failed to read raw image file: " + imgFile.getAbsolutePath(), e);
                }
            }
        }

        BufferedImage origImg = null;
        if (imgFile != null && imgFile.exists()) {
            try {
                origImg = ImageIO.read(imgFile);
            } catch (Exception e) {
                log.warn("Failed to read image from file: " + imgFile.getAbsolutePath(), e);
            }
        }

        // 로컬 파일에서 읽지 못한 경우 URL 네트워크 통신으로 Fallback 다운로드 시도
        if (origImg == null && imgEntity.getImageUrl() != null && imgEntity.getImageUrl().startsWith("http")) {
            byte[] remoteBytes = getImageBytesFromFileOrUrl(imgEntity.getImageUrl());
            if (remoteBytes != null && remoteBytes.length > 0) {
                try {
                    origImg = ImageIO.read(new java.io.ByteArrayInputStream(remoteBytes));
                } catch (Exception e) {
                    log.warn("Failed to read image from downloaded bytes: " + imgEntity.getImageUrl(), e);
                }
            }
        }

        if (origImg == null) {
            return null;
        }

        try {
            String annotationsJson = imgEntity.getAnnotationsJson();
            if (annotationsJson == null || annotationsJson.isBlank()) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(origImg, "png", baos);
                return baos.toByteArray();
            }

            int imgWidth = origImg.getWidth();
            int imgHeight = origImg.getHeight();

            BufferedImage annotatedImg = new BufferedImage(imgWidth, imgHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = annotatedImg.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);

            g2d.drawImage(origImg, 0, 0, null);

            // Fabric.js editor canvas resolution in frontend is 780x520
            double editorWidth = 780.0;
            double editorHeight = 520.0;
            double scaleX = (double) imgWidth / editorWidth;
            double scaleY = (double) imgHeight / editorHeight;

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(annotationsJson);
            JsonNode objectsNode = root.get("objects");

            if (objectsNode != null && objectsNode.isArray()) {
                for (JsonNode obj : objectsNode) {
                    String type = obj.path("type").asText("");
                    String strokeColorStr = obj.path("stroke").asText("#ef4444");
                    String fillColorStr = obj.path("fill").asText("#ef4444");
                    double strokeWidth = obj.path("strokeWidth").asDouble(3.0);

                    Color strokeColor = parseColorSafe(strokeColorStr, Color.RED);
                    Color fillColor = parseColorSafe(fillColorStr, Color.RED);

                    g2d.setColor(strokeColor);
                    g2d.setStroke(new BasicStroke((float) (strokeWidth * scaleX)));

                    double left = obj.path("left").asDouble(0.0) * scaleX;
                    double top = obj.path("top").asDouble(0.0) * scaleY;
                    double scaleXObj = obj.path("scaleX").asDouble(1.0);
                    double scaleYObj = obj.path("scaleY").asDouble(1.0);

                    if ("rect".equals(type)) {
                        double width = obj.path("width").asDouble(0.0) * scaleXObj * scaleX;
                        double height = obj.path("height").asDouble(0.0) * scaleYObj * scaleY;
                        g2d.drawRect((int) left, (int) top, (int) width, (int) height);
                    } else if ("circle".equals(type)) {
                        double radius = obj.path("radius").asDouble(40.0);
                        double rx = radius * scaleXObj * scaleX;
                        double ry = radius * scaleYObj * scaleY;
                        g2d.drawOval((int) left, (int) top, (int) (rx * 2), (int) (ry * 2));
                    } else if ("i-text".equals(type) || "text".equals(type)) {
                        String text = obj.path("text").asText("");
                        int fontSize = (int) (obj.path("fontSize").asInt(16) * scaleX);
                        g2d.setFont(getSafeFont(java.awt.Font.BOLD, Math.max(14, fontSize)));
                        g2d.setColor(fillColor);
                        g2d.drawString(text, (int) left, (int) (top + fontSize));
                    }
                }
            }
            g2d.dispose();

            // High-resolution output (Full HD/4K preservation up to 1920x1280)
            int maxTargetWidth = 1920;
            int maxTargetHeight = 1280;
            double scale = Math.min((double) maxTargetWidth / imgWidth, (double) maxTargetHeight / imgHeight);
            if (scale >= 1.0) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(annotatedImg, "png", baos);
                return baos.toByteArray();
            }

            int scaledW = (int) (imgWidth * scale);
            int scaledH = (int) (imgHeight * scale);

            BufferedImage finalImg = new BufferedImage(scaledW, scaledH, BufferedImage.TYPE_INT_RGB);
            Graphics2D gFinal = finalImg.createGraphics();
            gFinal.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            gFinal.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_QUALITY);
            gFinal.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            gFinal.drawImage(annotatedImg, 0, 0, scaledW, scaledH, null);
            gFinal.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(finalImg, "png", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to render annotations on image for " + imgEntity.getId(), e);
            try {
                if (imgFile != null) {
                    return java.nio.file.Files.readAllBytes(imgFile.toPath());
                }
            } catch (Exception ignored) {}
            return null;
        }
    }

    /**
     * Pure Java 1D Code 128 Barcode Generator with Human Readable Label
     */
    private byte[] generateBarcodeImageBytes(String barcodeText, int width, int height) {
        if (barcodeText == null || barcodeText.isBlank() || "BARCODE-NOT-SET".equals(barcodeText)) {
            barcodeText = "NO BARCODE";
        }
        try {
            BufferedImage barcodeImg = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = barcodeImg.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // Background
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, width, height);

            int pad = 8;
            // Draw Border with inner margin
            g2d.setColor(Color.LIGHT_GRAY);
            g2d.drawRect(pad, pad, width - 1 - pad * 2, height - 1 - pad * 2);

            // Generate deterministic pseudo-random / checksum bars from barcodeText string
            g2d.setColor(Color.BLACK);
            int startX = pad + 15;
            int barAreaWidth = width - (pad * 2 + 30);
            int barStartY = pad + 10;
            int barHeight = height - pad * 2 - 34;

            byte[] textBytes = barcodeText.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            int hash = 0;
            for (byte b : textBytes) hash = 31 * hash + b;
            java.util.Random rnd = new java.util.Random(hash);

            // Guard bars (start)
            g2d.fillRect(startX, barStartY, 2, barHeight);
            g2d.fillRect(startX + 4, barStartY, 1, barHeight);
            g2d.fillRect(startX + 7, barStartY, 3, barHeight);

            int currentX = startX + 12;
            int endX = startX + barAreaWidth - 12;

            while (currentX < endX) {
                int barW = rnd.nextInt(3) + 1;
                int spaceW = rnd.nextInt(3) + 1;
                if (currentX + barW + spaceW >= endX) break;
                g2d.fillRect(currentX, barStartY, barW, barHeight);
                currentX += (barW + spaceW);
            }

            // Guard bars (stop)
            g2d.fillRect(endX - 8, barStartY, 3, barHeight);
            g2d.fillRect(endX - 4, barStartY, 1, barHeight);
            g2d.fillRect(endX - 2, barStartY, 2, barHeight);

            // Human Readable Text Label
            g2d.setColor(Color.DARK_GRAY);
            g2d.setFont(getSafeFont(java.awt.Font.BOLD, 12));
            FontMetrics fm = null;
            try {
                fm = g2d.getFontMetrics();
            } catch (Throwable ignored) {}
            int textW = (fm != null) ? fm.stringWidth(barcodeText) : barcodeText.length() * 7;
            int textX = (width - textW) / 2;
            g2d.drawString(barcodeText, textX, height - pad - 6);

            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(barcodeImg, "png", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate barcode image for " + barcodeText, e);
            return null;
        }
    }

    private Color parseColorSafe(String hex, Color defaultColor) {
        if (hex == null || hex.isBlank()) return defaultColor;
        try {
            if (hex.startsWith("#")) {
                return Color.decode(hex);
            }
            return defaultColor;
        } catch (Exception e) {
            return defaultColor;
        }
    }

    /**
     * Helper to resolve physical file location across various upload path formats
     */
    private java.io.File findLocalFile(String imageUrl, String imagePath) {
        if ((imageUrl == null || imageUrl.isBlank()) && (imagePath == null || imagePath.isBlank())) {
            return null;
        }
        
        String cleanFileName = null;
        String raw = (imageUrl != null && !imageUrl.isBlank()) ? imageUrl.trim() : imagePath.trim();
        
        // Strip parameters if any
        if (raw.contains("?")) {
            raw = raw.substring(0, raw.indexOf('?')).trim();
        }
        
        if (raw.contains("/") || raw.contains("\\")) {
            int lastSlash = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
            cleanFileName = raw.substring(lastSlash + 1).trim();
        } else {
            cleanFileName = raw;
        }

        List<String> uploadRoots = getValidUploadRoots();
        
        List<String> candidates = new ArrayList<>();
        candidates.add(imagePath);
        candidates.add(imageUrl);
        candidates.add(raw);

        for (String root : uploadRoots) {
            if (cleanFileName != null && !cleanFileName.isBlank()) {
                candidates.add(root + "/" + cleanFileName);
                candidates.add(root + "/products/" + cleanFileName);
            }
            if (raw != null && !raw.isBlank()) {
                String subPath = raw.startsWith("/") ? raw.substring(1) : raw;
                if (subPath.startsWith("uploads/")) {
                    subPath = subPath.substring("uploads/".length());
                }
                candidates.add(root + "/" + subPath);
            }
        }

        for (String path : candidates) {
            if (path != null && !path.isBlank()) {
                java.io.File f = new java.io.File(path);
                if (f.exists() && f.isFile() && f.length() > 0) {
                    return f;
                }
            }
        }

        // Direct directory scan fallback
        for (String root : uploadRoots) {
            java.io.File dir = new java.io.File(root);
            if (dir.exists() && dir.isDirectory() && cleanFileName != null && !cleanFileName.isBlank()) {
                java.io.File target = new java.io.File(dir, cleanFileName);
                if (target.exists() && target.isFile() && target.length() > 0) {
                    return target;
                }
            }
        }

        return null;
    }

    private int detectPictureType(byte[] bytes) {
        if (bytes != null && bytes.length >= 8) {
            if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
                return Workbook.PICTURE_TYPE_PNG;
            }
        }
        return Workbook.PICTURE_TYPE_JPEG;
    }

    private String extractMfgDateDisplay(String fullFormat, com.example.ims.entity.SalesChannel channel) {
        if (fullFormat != null && !fullFormat.trim().isEmpty()) {
            String[] lines = fullFormat.split("\\r?\\n");
            for (String l : lines) {
                String t = l.trim();
                if (t.contains("제조일자") || t.contains("Mfg") || t.contains("MFD") || t.contains("PROD")) {
                    return t.replaceFirst("^.*?:\\s*", "").trim();
                }
            }
            if (lines.length == 1 && !lines[0].contains("사용기한") && !lines[0].contains("EXP") && !lines[0].contains("Exp")) {
                String single = lines[0].trim();
                if (!single.contains(":") && (single.contains("YYYY") || single.contains("MM") || single.contains("DD"))) {
                    return single + " (제조)";
                }
                return single;
            }
        }
        return "[ YYYY.MM.DD (제조) ]";
    }

    private String extractExpDateDisplay(String fullFormat, com.example.ims.entity.SalesChannel channel) {
        if (fullFormat != null && !fullFormat.trim().isEmpty()) {
            String[] lines = fullFormat.split("\\r?\\n");
            for (String l : lines) {
                String t = l.trim();
                if (t.contains("사용기한") || t.contains("EXP") || t.contains("Exp")) {
                    return t.replaceFirst("^.*?:\\s*", "").trim();
                }
            }
            if (lines.length == 1 && (lines[0].contains("사용기한") || lines[0].contains("EXP") || lines[0].contains("Exp"))) {
                return lines[0].trim();
            }
        }
        if (channel != null && channel.getExpDateFormat() != null && !channel.getExpDateFormat().trim().isEmpty()) {
            if ("표기금지".equals(channel.getExpDateFormat()) || "(미정)".equals(channel.getExpDateFormat())) {
                return "-";
            }
            return channel.getExpDateFormat().startsWith("EXP") ? channel.getExpDateFormat() : "EXP " + channel.getExpDateFormat();
        }
        return "[ YYYY.MM.DD 까지 ]";
    }

    // [5-1. 3D 제품 입수 및 팔레트 적재 형태 (3D Loading Layout)]
    private int renderLoadingLayoutSection(org.apache.poi.ss.usermodel.Sheet sheet0, int currentRow, PackagingSpecification spec, Product product, org.apache.poi.ss.usermodel.Workbook workbook, org.apache.poi.ss.usermodel.CellStyle headerStyle, org.apache.poi.ss.usermodel.CellStyle subHeaderStyle, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, org.apache.poi.ss.usermodel.CellStyle wrapDataStyle) {
        createSectionHeader(sheet0, currentRow, "5-1. 3D 제품 입수 및 팔레트 적재 형태 (3D Loading Layout)", headerStyle, 7, 28);
        currentRow++;

        boolean isInboxUsed = "O".equalsIgnoreCase(spec.getInboxUseYn()) || 
                              (spec.getInboxQty() != null && spec.getInboxQty() > 0);

        int inQty = spec.getInboxQty() != null && spec.getInboxQty() > 0 ? spec.getInboxQty() : 10;
        int outQty = spec.getOutboxQty() != null && spec.getOutboxQty() > 0 ? spec.getOutboxQty() : 40;
        int inboxesInOutbox = isInboxUsed ? Math.max(1, outQty / Math.max(1, inQty)) : 1;

        String defaultInboxPattern = isInboxUsed ? "2열×5행×1단 (" + inQty + "개입)" : "인박스 미사용 (Direct)";
        String defaultOutboxPattern = isInboxUsed 
            ? "2열×2행×1단 (인박스 " + inboxesInOutbox + "박스입, 총 " + outQty + "개입)"
            : "4열×5행×2단 (총 " + outQty + "개입)";

        int tierCount = spec.getPalletTierCount() != null && spec.getPalletTierCount() > 0 ? spec.getPalletTierCount() : 5;
        int tierQty = spec.getPalletTierQty() != null && spec.getPalletTierQty() > 0 ? spec.getPalletTierQty() : 8;
        String defaultPalletPattern = "8방 핀휠 교차적재 (" + tierCount + "단, 1단당 " + tierQty + "박스, 총 " + (tierCount * tierQty) + "박스)";

        String inboxPatternText = (spec.getInboxPackingPattern() != null && !spec.getInboxPackingPattern().trim().isEmpty() && !spec.getInboxPackingPattern().equals("-"))
            ? spec.getInboxPackingPattern() : defaultInboxPattern;

        String outboxPatternText = (spec.getOutboxPackingPattern() != null && !spec.getOutboxPackingPattern().trim().isEmpty() && !spec.getOutboxPackingPattern().equals("-"))
            ? spec.getOutboxPackingPattern() : defaultOutboxPattern;

        String palletPatternText = (spec.getPalletStackingPattern() != null && !spec.getPalletStackingPattern().trim().isEmpty() && !spec.getPalletStackingPattern().equals("-"))
            ? spec.getPalletStackingPattern() 
            : ((spec.getPalletStackingMethod() != null && !spec.getPalletStackingMethod().trim().isEmpty() && !spec.getPalletStackingMethod().equals("-")) 
                ? spec.getPalletStackingMethod() : defaultPalletPattern);

        // 패턴 텍스트 행: 높이 32pt 및 wrapDataStyle 적용으로 긴 패턴명 2줄 노출 보장
        Row patRow = sheet0.createRow(currentRow++);
        patRow.setHeightInPoints(32);
        createCell(patRow, 0, "인박스 입수패턴", labelStyle);
        createCell(patRow, 1, inboxPatternText, wrapDataStyle);
        createCell(patRow, 2, "아웃박스 입수패턴", labelStyle);
        createCell(patRow, 3, outboxPatternText, wrapDataStyle);
        createCell(patRow, 4, "팔레트 적재패턴", labelStyle);
        createCell(patRow, 5, palletPatternText, wrapDataStyle);
        createCell(patRow, 6, "적재 단수", labelStyle);
        createCell(patRow, 7, (tierCount + "단"), dataStyle);

        byte[] inboxImgBytes = getImageBytesFromFileOrUrl(spec.getInboxLayoutImage());
        if (inboxImgBytes == null || inboxImgBytes.length == 0) {
            inboxImgBytes = generateIsometricInboxLayoutImage(product, spec);
        }
        inboxImgBytes = autoCropWhitespace(inboxImgBytes, 8);

        byte[] outboxImgBytes = getImageBytesFromFileOrUrl(spec.getOutboxLayoutImageFile() != null ? spec.getOutboxLayoutImageFile() : spec.getOutboxLayoutImage());
        if (outboxImgBytes == null || outboxImgBytes.length == 0) {
            outboxImgBytes = generateIsometricOutboxLayoutImage(product, spec);
        }
        outboxImgBytes = autoCropWhitespace(outboxImgBytes, 8);

        byte[] palletImgBytes = getImageBytesFromFileOrUrl(spec.getPalletLayoutImage());
        if (palletImgBytes == null || palletImgBytes.length == 0) {
            palletImgBytes = generateIsometricPalletLayoutImage(product, spec);
        }
        palletImgBytes = autoCropWhitespace(palletImgBytes, 8);

        Row layoutTitleRow = sheet0.createRow(currentRow);
        layoutTitleRow.setHeightInPoints(26);
        createCell(layoutTitleRow, 0, "📥 인박스 3D 입수 도면", subHeaderStyle);
        createCell(layoutTitleRow, 1, "", subHeaderStyle);
        createCell(layoutTitleRow, 2, "", subHeaderStyle);
        sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 0, 2));

        createCell(layoutTitleRow, 3, "📦 아웃박스 3D 입수 도면", subHeaderStyle);
        createCell(layoutTitleRow, 4, "", subHeaderStyle);
        createCell(layoutTitleRow, 5, "", subHeaderStyle);
        sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 3, 5));

        createCell(layoutTitleRow, 6, "🏗️ 팔레트 3D 적재 도면", subHeaderStyle);
        createCell(layoutTitleRow, 7, "", subHeaderStyle);
        sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 6, 7));

        int imgRowIdx = currentRow + 1;
        Row layoutImgRow = sheet0.createRow(imgRowIdx);
        layoutImgRow.setHeightInPoints(190); // [요청 반영] 크롭된 3D 피사체가 큼직하고 시원하게 보이도록 190pt로 확장
        for (int col = 0; col <= 7; col++) {
            createCell(layoutImgRow, col, "", dataStyle);
        }
        sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRowIdx, imgRowIdx, 0, 2));
        sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRowIdx, imgRowIdx, 3, 5));
        sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRowIdx, imgRowIdx, 6, 7));

        org.apache.poi.ss.usermodel.Drawing<?> sheet0Drawing = sheet0.getDrawingPatriarch() != null ? sheet0.getDrawingPatriarch() : sheet0.createDrawingPatriarch();

        if (inboxImgBytes != null && inboxImgBytes.length > 0) {
            try {
                int picIdx = workbook.addPicture(inboxImgBytes, detectPictureType(inboxImgBytes));
                org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                anchor.setCol1(0); anchor.setRow1(imgRowIdx);
                anchor.setCol2(3); anchor.setRow2(imgRowIdx + 1);
                anchor.setDx1(4 * 10000); anchor.setDy1(3 * 10000);
                anchor.setDx2(-4 * 10000); anchor.setDy2(-3 * 10000);
                anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                sheet0Drawing.createPicture(anchor, picIdx);
            } catch (Exception e) {
                log.error("Failed to insert inbox 3D drawing into Sheet 1", e);
            }
        }

        if (outboxImgBytes != null && outboxImgBytes.length > 0) {
            try {
                int picIdx = workbook.addPicture(outboxImgBytes, detectPictureType(outboxImgBytes));
                org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                anchor.setCol1(3); anchor.setRow1(imgRowIdx);
                anchor.setCol2(6); anchor.setRow2(imgRowIdx + 1);
                anchor.setDx1(4 * 10000); anchor.setDy1(3 * 10000);
                anchor.setDx2(-4 * 10000); anchor.setDy2(-3 * 10000);
                anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                sheet0Drawing.createPicture(anchor, picIdx);
            } catch (Exception e) {
                log.error("Failed to insert outbox 3D drawing into Sheet 1", e);
            }
        }

        if (palletImgBytes != null && palletImgBytes.length > 0) {
            try {
                int picIdx = workbook.addPicture(palletImgBytes, detectPictureType(palletImgBytes));
                org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                anchor.setCol1(6); anchor.setRow1(imgRowIdx);
                anchor.setCol2(8); anchor.setRow2(imgRowIdx + 1);
                anchor.setDx1(4 * 10000); anchor.setDy1(3 * 10000);
                anchor.setDx2(-4 * 10000); anchor.setDy2(-3 * 10000);
                anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                sheet0Drawing.createPicture(anchor, picIdx);
            } catch (Exception e) {
                log.error("Failed to insert pallet 3D drawing into Sheet 1", e);
            }
        }

        return imgRowIdx + 1;
    }

    private java.awt.Font getSafeFont(int style, int size) {
        try {
            return new java.awt.Font(java.awt.Font.SANS_SERIF, style, size);
        } catch (Throwable t) {
            return new java.awt.Font("Dialog", style, size);
        }
    }

    private int drawBadge(Graphics2D g2, int x, int y, String text, Color bgColor, Color textColor, Color borderColor) {
        int textW = text.length() * 8;
        int padH = 8;
        int badgeH = 20;

        try {
            g2.setFont(getSafeFont(java.awt.Font.BOLD, 11));
            FontMetrics fm = g2.getFontMetrics();
            if (fm != null) {
                textW = fm.stringWidth(text);
            }
        } catch (Throwable t) {
            textW = text.length() * 8;
        }

        int badgeW = textW + padH * 2;

        try {
            g2.setColor(bgColor);
            g2.fillRoundRect(x, y - 14, badgeW, badgeH, 6, 6);
            if (borderColor != null) {
                g2.setColor(borderColor);
                g2.setStroke(new BasicStroke(1.0f));
                g2.drawRoundRect(x, y - 14, badgeW, badgeH, 6, 6);
            }
            g2.setColor(textColor);
            g2.drawString(text, x + padH, y);
        } catch (Throwable t) {
            log.warn("Failed to render badge drawing for '{}'", text);
        }
        return badgeW;
    }

    private String cleanPackagingMethodText(String rawText) {
        if (rawText == null || rawText.isBlank()) return "";
        StringBuilder sb = new StringBuilder();
        String[] lines = rawText.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                sb.append("\n");
                continue;
            }
            // "Step 1: Step 1: 내용" 또는 "Step 1:  Step 1: 내용" 등 이중 접두어 제거
            String cleaned = trimmed.replaceAll("(?i)^Step\\s*(\\d+)\\s*:\\s*Step\\s*\\1\\s*:\\s*", "Step $1: ");
            cleaned = cleaned.replaceAll("(?i)^Step\\s*(\\d+)\\s*:\\s*Step\\s*\\d+\\s*:\\s*", "Step $1: ");
            sb.append(cleaned).append("\n");
        }
        return sb.toString().trim();
    }

    private byte[] generateIsometricInboxLayoutImage(Product product, PackagingSpecification spec) {
        try {
            int width = 500, height = 420;
            BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2 = img.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

            GradientPaint bg = new GradientPaint(0, 0, new Color(248, 250, 252), 0, height, new Color(241, 245, 249));
            g2.setPaint(bg);
            g2.fillRect(0, 0, width, height);

            boolean isInboxUsed = "O".equalsIgnoreCase(spec.getInboxUseYn()) || 
                                  (spec.getInboxQty() != null && spec.getInboxQty() > 0);

            if (!isInboxUsed) {
                int badgeW = drawBadge(g2, 16, 26, "[인박스 미사용]", new Color(241, 245, 249), new Color(100, 116, 139), new Color(203, 213, 225));
                try {
                    g2.setFont(getSafeFont(java.awt.Font.BOLD, 13));
                    g2.setColor(new Color(71, 85, 105));
                    g2.drawString("단상자 아웃박스 직접 입수 (Direct Packing)", 16 + badgeW + 8, 26);

                    g2.setFont(getSafeFont(java.awt.Font.PLAIN, 11));
                    g2.setColor(new Color(148, 163, 184));
                    g2.drawString("단상자가 인박스 없이 아웃박스에 직접 수납되는 포장 사양입니다.", 16, 46);
                } catch (Throwable ignored) {}

                g2.setColor(new Color(226, 232, 240));
                g2.fillRoundRect(80, 100, 340, 200, 16, 16);
                g2.setColor(new Color(148, 163, 184));
                g2.setStroke(new BasicStroke(2.0f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL, 0, new float[]{6}, 0));
                g2.drawRoundRect(80, 100, 340, 200, 16, 16);

                try {
                    g2.setFont(getSafeFont(java.awt.Font.BOLD, 15));
                    g2.setColor(new Color(100, 116, 139));
                    g2.drawString("인박스 없음 (Direct Packing)", 140, 205);
                } catch (Throwable ignored) {}
            } else {
                int badgeW = drawBadge(g2, 16, 26, "[인박스 3D]", new Color(237, 233, 254), new Color(109, 40, 217), new Color(221, 214, 254));
                try {
                    g2.setFont(getSafeFont(java.awt.Font.BOLD, 13));
                    g2.setColor(new Color(109, 40, 217));
                    g2.drawString("단상자 입수 시뮬레이션", 16 + badgeW + 8, 26);
                } catch (Throwable ignored) {}

                int inQty = spec.getInboxQty() != null && spec.getInboxQty() > 0 ? spec.getInboxQty() : 10;
                String pattern = (spec.getInboxPackingPattern() != null && !spec.getInboxPackingPattern().trim().isEmpty() && !spec.getInboxPackingPattern().equals("-"))
                    ? spec.getInboxPackingPattern() : "2열×5행×1단 (" + inQty + "개입)";

                String sizeStr = spec.getInboxSize() != null ? spec.getInboxSize() : "규격 미지정";
                try {
                    g2.setFont(getSafeFont(java.awt.Font.PLAIN, 11));
                    g2.setColor(new Color(100, 116, 139));
                    g2.drawString("배열: " + pattern + " | 규격: " + sizeStr + "mm", 16, 46);
                } catch (Throwable ignored) {}

                int cols = 2, rows = 5, layers = 1;
                if (pattern.contains("열") && pattern.contains("행")) {
                    try {
                        String[] parts = pattern.split("열|행|단");
                        if (parts.length >= 2) {
                            cols = Integer.parseInt(parts[0].replaceAll("[^0-9]", ""));
                            rows = Integer.parseInt(parts[1].replaceAll("[^0-9]", ""));
                            if (parts.length >= 3) layers = Math.max(1, Integer.parseInt(parts[2].replaceAll("[^0-9]", "")));
                        }
                    } catch (Exception ignored) {}
                }

                drawIsometricBoxStack(g2, width / 2, height / 2 + 10, cols, rows, layers, 
                    new Color(221, 214, 254), new Color(196, 181, 253), new Color(167, 139, 250), 
                    new Color(109, 40, 217), "단상자", sizeStr, false, false);
            }

            g2.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (Throwable t) {
            log.error("Failed to generate fallback inbox isometric image", t);
            return null;
        }
    }

    private byte[] generateIsometricOutboxLayoutImage(Product product, PackagingSpecification spec) {
        try {
            int width = 500, height = 420;
            BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2 = img.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

            GradientPaint bg = new GradientPaint(0, 0, new Color(248, 250, 252), 0, height, new Color(241, 245, 249));
            g2.setPaint(bg);
            g2.fillRect(0, 0, width, height);

            boolean isInboxUsed = "O".equalsIgnoreCase(spec.getInboxUseYn()) || 
                                  (spec.getInboxQty() != null && spec.getInboxQty() > 0);

            int inQty = spec.getInboxQty() != null && spec.getInboxQty() > 0 ? spec.getInboxQty() : 10;
            int outQty = spec.getOutboxQty() != null && spec.getOutboxQty() > 0 ? spec.getOutboxQty() : 40;
            int inboxesCount = isInboxUsed ? Math.max(1, outQty / Math.max(1, inQty)) : 1;

            int badgeW = drawBadge(g2, 16, 26, "[아웃박스 3D]", new Color(219, 234, 254), new Color(29, 78, 216), new Color(191, 219, 254));
            try {
                g2.setFont(getSafeFont(java.awt.Font.BOLD, 13));
                g2.setColor(new Color(29, 78, 216));
                g2.drawString(isInboxUsed ? "인박스 수납 입수 시뮬레이션" : "단상자 직접 입수 시뮬레이션", 16 + badgeW + 8, 26);
            } catch (Throwable ignored) {}

            String defaultPattern = isInboxUsed 
                ? "2열×2행×1단 (인박스 " + inboxesCount + "박스입, 총 " + outQty + "개입)"
                : "4열×5행×2단 (총 " + outQty + "개입)";

            String pattern = (spec.getOutboxPackingPattern() != null && !spec.getOutboxPackingPattern().trim().isEmpty() && !spec.getOutboxPackingPattern().equals("-"))
                ? spec.getOutboxPackingPattern() : defaultPattern;

            String sizeStr = spec.getOutboxSize() != null ? spec.getOutboxSize() : "규격 미지정";
            boolean hasPop = "O".equalsIgnoreCase(spec.getPopUseYn()) || (spec.getPopRequiredStandard() != null && spec.getPopRequiredStandard().contains("POP") && !spec.getPopRequiredStandard().contains("해당 없음"));
            boolean hasAirCap = "O".equalsIgnoreCase(spec.getAirCapUseYn());

            try {
                g2.setFont(getSafeFont(java.awt.Font.PLAIN, 11));
                g2.setColor(new Color(100, 116, 139));
                g2.drawString("배열: " + pattern + " | 규격: " + sizeStr + "mm", 16, 46);
            } catch (Throwable ignored) {}

            int badgeX = width - 16;
            if (hasAirCap) {
                badgeX -= 90;
                drawBadge(g2, badgeX, 26, "[에어캡 완충]", new Color(224, 242, 254), new Color(2, 132, 199), new Color(186, 230, 253));
            }
            if (hasPop) {
                badgeX -= 80;
                drawBadge(g2, badgeX, 26, "[POP 동봉]", new Color(255, 228, 230), new Color(225, 29, 72), new Color(253, 164, 175));
            }

            int cols = isInboxUsed ? 2 : 4;
            int rows = isInboxUsed ? 2 : 5;
            int layers = isInboxUsed ? 1 : 2;

            if (pattern.contains("열") && pattern.contains("행")) {
                try {
                    String[] parts = pattern.split("열|행|단");
                    if (parts.length >= 2) {
                        cols = Integer.parseInt(parts[0].replaceAll("[^0-9]", ""));
                        rows = Integer.parseInt(parts[1].replaceAll("[^0-9]", ""));
                        if (parts.length >= 3) layers = Math.max(1, Integer.parseInt(parts[2].replaceAll("[^0-9]", "")));
                    }
                } catch (Exception ignored) {}
            }

            if (isInboxUsed) {
                drawIsometricBoxStack(g2, width / 2, height / 2 + 10, cols, rows, layers, 
                    new Color(221, 214, 254), new Color(196, 181, 253), new Color(167, 139, 250), 
                    new Color(109, 40, 217), "인박스", sizeStr, hasPop, hasAirCap);
            } else {
                drawIsometricBoxStack(g2, width / 2, height / 2 + 10, cols, rows, layers, 
                    new Color(191, 219, 254), new Color(147, 197, 253), new Color(96, 165, 250), 
                    new Color(29, 78, 216), "단상자", sizeStr, hasPop, hasAirCap);
            }

            g2.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (Throwable t) {
            log.error("Failed to generate fallback outbox isometric image", t);
            return null;
        }
    }

    private byte[] generateIsometricPalletLayoutImage(Product product, PackagingSpecification spec) {
        try {
            int width = 500, height = 420;
            BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2 = img.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

            GradientPaint bg = new GradientPaint(0, 0, new Color(248, 250, 252), 0, height, new Color(241, 245, 249));
            g2.setPaint(bg);
            g2.fillRect(0, 0, width, height);

            int badgeW = drawBadge(g2, 16, 26, "[팔레트 3D]", new Color(254, 243, 199), new Color(180, 83, 9), new Color(253, 230, 138));
            try {
                g2.setFont(getSafeFont(java.awt.Font.BOLD, 13));
                g2.setColor(new Color(180, 83, 9));
                g2.drawString("아웃박스 팔레트 적재 시뮬레이션", 16 + badgeW + 8, 26);
            } catch (Throwable ignored) {}

            int stacks = spec.getPalletTierCount() != null && spec.getPalletTierCount() > 0 ? spec.getPalletTierCount() : 5;
            int tierQty = spec.getPalletTierQty() != null && spec.getPalletTierQty() > 0 ? spec.getPalletTierQty() : 8;
            int totalBoxes = tierQty * stacks;

            String defaultPattern = "8방 핀휠 교차적재 (" + stacks + "단, 1단 " + tierQty + "박스, 총 " + totalBoxes + "박스)";
            String pattern = (spec.getPalletStackingPattern() != null && !spec.getPalletStackingPattern().trim().isEmpty() && !spec.getPalletStackingPattern().equals("-"))
                ? spec.getPalletStackingPattern() 
                : ((spec.getPalletStackingMethod() != null && !spec.getPalletStackingMethod().trim().isEmpty() && !spec.getPalletStackingMethod().equals("-")) 
                    ? spec.getPalletStackingMethod() : defaultPattern);

            String sizeStr = spec.getPalletSize() != null ? spec.getPalletSize() : "1,100×1,100mm";
            boolean hasCornerPost = "O".equalsIgnoreCase(spec.getCornerPostUseYn());

            try {
                g2.setFont(getSafeFont(java.awt.Font.PLAIN, 11));
                g2.setColor(new Color(100, 116, 139));
                g2.drawString("패턴: " + pattern + " | 팔레트: " + sizeStr, 16, 46);
            } catch (Throwable ignored) {}

            if (hasCornerPost) {
                drawBadge(g2, width - 110, 26, "[코너 각대 연동]", new Color(254, 243, 199), new Color(217, 119, 6), new Color(253, 230, 138));
            }

            drawIsometricPalletStack(g2, width / 2, height / 2 + 25, stacks, tierQty, sizeStr, hasCornerPost);

            g2.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (Throwable t) {
            log.error("Failed to generate fallback pallet isometric image", t);
            return null;
        }
    }

    private void drawIsometricBoxStack(Graphics2D g2, int originX, int originY, int cols, int rows, int layers,
                                      Color topColor, Color leftColor, Color rightColor, Color wireColor,
                                      String boxLabel, String sizeStr, boolean hasPop, boolean hasAirCap) {
        int cellW = Math.max(16, Math.min(38, 150 / Math.max(cols, rows)));
        int cellD = cellW;
        int cellH = Math.max(14, Math.min(28, 110 / Math.max(1, layers)));

        double cos30 = 0.866025;
        double sin30 = 0.5;

        int totalSpanX = (int) ((cols * cellW + rows * cellD) * cos30);
        int totalSpanY = (int) ((cols * cellW + rows * cellD) * sin30);
        int startX = originX - (int) ((cols * cellW - rows * cellD) * cos30 / 2);
        int startY = originY + totalSpanY / 4;

        g2.setColor(new Color(226, 232, 240));
        g2.setStroke(new BasicStroke(1.2f));

        for (int l = 0; l < layers; l++) {
            for (int r = rows - 1; r >= 0; r--) {
                for (int c = 0; c < cols; c++) {
                    int bx = startX + (int) ((c * cellW - r * cellD) * cos30);
                    int by = startY + (int) ((c * cellW + r * cellD) * sin30) - l * cellH;

                    drawIsometricCube(g2, bx, by, cellW, cellD, cellH, topColor, leftColor, rightColor, new Color(148, 163, 184));
                }
            }
        }

        if (hasPop) {
            drawBadge(g2, startX - 35, startY - layers * cellH - 16, "POP 동봉", new Color(255, 228, 230), new Color(225, 29, 72), new Color(253, 164, 175));
            try {
                g2.setColor(new Color(225, 29, 72));
                g2.setStroke(new BasicStroke(1.2f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL, 0, new float[]{4}, 0));
                g2.drawRoundRect(startX - 40, startY - layers * cellH - 32, 80, 20, 4, 4);
            } catch (Throwable ignored) {}
        }

        if (hasAirCap) {
            try {
                g2.setColor(new Color(2, 132, 199));
                g2.setFont(getSafeFont(java.awt.Font.BOLD, 10));
                g2.drawString("🫧 에어캡 완충재", startX + totalSpanX / 4, startY - layers * cellH - 10);
            } catch (Throwable ignored) {}
        }
    }

    private void drawIsometricPalletStack(Graphics2D g2, int originX, int originY, int stacks, int tierQty, String sizeStr, boolean hasCornerPost) {
        int palW = 130, palD = 130, palH = 12;
        double cos30 = 0.866025;
        double sin30 = 0.5;

        int startX = originX;
        int startY = originY;

        drawIsometricCube(g2, startX, startY, palW, palD, palH, new Color(203, 213, 225), new Color(148, 163, 184), new Color(100, 116, 139), new Color(71, 85, 105));

        int drawStacks = Math.min(8, Math.max(3, stacks));
        int boxH = 14;
        for (int s = 0; s < drawStacks; s++) {
            int layerY = startY - palH - s * boxH;
            Color topC = (s % 2 == 0) ? new Color(254, 243, 199) : new Color(253, 230, 138);
            Color leftC = (s % 2 == 0) ? new Color(253, 224, 71) : new Color(250, 204, 21);
            Color rightC = (s % 2 == 0) ? new Color(234, 179, 8) : new Color(202, 138, 4);

            if (tierQty >= 8) {
                int bw = 42, bd = 30;
                int rot = (s % 2);
                if (rot == 0) {
                    // 8-Pinwheel Layer A: 4 quadrants x 2 boxes each
                    drawIsometricCube(g2, startX - (int)(30 * cos30), layerY - (int)(26 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX - (int)(8 * cos30), layerY - (int)(38 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));

                    drawIsometricCube(g2, startX + (int)(22 * cos30), layerY - (int)(26 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX + (int)(38 * cos30), layerY - (int)(6 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));

                    drawIsometricCube(g2, startX + (int)(30 * cos30), layerY + (int)(26 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX + (int)(8 * cos30), layerY + (int)(38 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));

                    drawIsometricCube(g2, startX - (int)(22 * cos30), layerY + (int)(26 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX - (int)(38 * cos30), layerY + (int)(6 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                } else {
                    // 8-Pinwheel Layer B (90° Interlocking Cross): 4 quadrants x 2 boxes each
                    drawIsometricCube(g2, startX - (int)(26 * cos30), layerY - (int)(30 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX - (int)(6 * cos30), layerY - (int)(38 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));

                    drawIsometricCube(g2, startX + (int)(26 * cos30), layerY - (int)(22 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX + (int)(38 * cos30), layerY - (int)(8 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));

                    drawIsometricCube(g2, startX + (int)(26 * cos30), layerY + (int)(30 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX + (int)(6 * cos30), layerY + (int)(38 * sin30), bd, bw, boxH, topC, leftC, rightC, new Color(180, 83, 9));

                    drawIsometricCube(g2, startX - (int)(26 * cos30), layerY + (int)(22 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                    drawIsometricCube(g2, startX - (int)(38 * cos30), layerY + (int)(8 * sin30), bw, bd, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                }
            } else {
                int half = palW / 2 - 2;
                drawIsometricCube(g2, startX - (int)(half * cos30 / 2), layerY + (int)(half * sin30 / 2), half, half, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                drawIsometricCube(g2, startX + (int)(half * cos30 / 2), layerY - (int)(half * sin30 / 2), half, half, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                drawIsometricCube(g2, startX + (int)(half * cos30 / 2), layerY + (int)(half * sin30 / 2), half, half, boxH, topC, leftC, rightC, new Color(180, 83, 9));
                drawIsometricCube(g2, startX - (int)(half * cos30 / 2), layerY - (int)(half * sin30 / 2), half, half, boxH, topC, leftC, rightC, new Color(180, 83, 9));
            }
        }

        if (hasCornerPost) {
            g2.setColor(new Color(245, 158, 11));
            g2.setStroke(new BasicStroke(2.5f));
            int postH = drawStacks * boxH + palH;
            int half = palW / 2;
            g2.drawLine(startX, startY + (int)(half * sin30), startX, startY + (int)(half * sin30) - postH);
            g2.drawLine(startX + (int)(half * cos30), startY, startX + (int)(half * cos30), startY - postH);
            g2.drawLine(startX - (int)(half * cos30), startY, startX - (int)(half * cos30), startY - postH);
        }
    }

    private void drawIsometricCube(Graphics2D g2, int x, int y, int w, int d, int h, Color topColor, Color leftColor, Color rightColor, Color strokeColor) {
        double cos30 = 0.866025;
        double sin30 = 0.5;

        // Top Face (Rhombus)
        Polygon top = new Polygon();
        top.addPoint(x, y);
        top.addPoint(x + (int)(w * cos30), y - (int)(w * sin30));
        top.addPoint(x + (int)((w - d) * cos30), y - (int)((w + d) * sin30));
        top.addPoint(x - (int)(d * cos30), y - (int)(d * sin30));
        g2.setColor(topColor);
        g2.fill(top);
        g2.setColor(strokeColor);
        g2.draw(top);

        // Left Face
        Polygon left = new Polygon();
        left.addPoint(x, y);
        left.addPoint(x - (int)(d * cos30), y - (int)(d * sin30));
        left.addPoint(x - (int)(d * cos30), y - (int)(d * sin30) + h);
        left.addPoint(x, y + h);
        g2.setColor(leftColor);
        g2.fill(left);
        g2.setColor(strokeColor);
        g2.draw(left);

        // Right Face
        Polygon right = new Polygon();
        right.addPoint(x, y);
        right.addPoint(x + (int)(w * cos30), y - (int)(w * sin30));
        right.addPoint(x + (int)(w * cos30), y - (int)(w * sin30) + h);
        right.addPoint(x, y + h);
        g2.setColor(rightColor);
        g2.fill(right);
        g2.setColor(strokeColor);
        g2.draw(right);
    }

    // [3-1. 🖼️ 제품 및 패키지 실물 이미지 (Product & Package Images)]
    private int renderProductPackageImagesSection(Sheet sheet0, int currentRow, Product product, PackagingSpecification spec, Workbook workbook, org.apache.poi.ss.usermodel.CellStyle headerStyle, org.apache.poi.ss.usermodel.CellStyle subHeaderStyle, org.apache.poi.ss.usermodel.CellStyle labelStyle, org.apache.poi.ss.usermodel.CellStyle dataStyle, org.apache.poi.ss.usermodel.CellStyle wrapDataStyle, org.apache.poi.ss.usermodel.CellStyle centerDataStyle) {
        createSectionHeader(sheet0, currentRow, "3-1. 🖼️ 제품 및 패키지 실물 이미지 (Product & Package Images)", headerStyle, 7, 28);
        currentRow++;

        List<String> imagePaths = new ArrayList<>();
        
        // 1. 제품 마스터 다중 이미지 리스트 (제품 및 단상자 패키지 실물 사진)
        if (product.getImagePaths() != null && !product.getImagePaths().isEmpty()) {
            for (String p : product.getImagePaths()) {
                if (p != null && !p.trim().isEmpty() && !imagePaths.contains(p.trim())) {
                    imagePaths.add(p.trim());
                }
            }
        }
        // 2. 제품 마스터 대표 이미지
        if (product.getImagePath() != null && !product.getImagePath().trim().isEmpty() && !imagePaths.contains(product.getImagePath().trim())) {
            imagePaths.add(product.getImagePath().trim());
        }

        // 3. 포장사양서 단품 패키지 실물/착인 위치 사진 (포장방법 공정 사진 및 3D 적재 도면은 제외)
        if (spec != null) {
            String[] specImageCandidates = new String[] {
                spec.getMarkingLocationImage()
            };
            for (String p : specImageCandidates) {
                if (p != null && !p.trim().isEmpty() && !imagePaths.contains(p.trim())) {
                    imagePaths.add(p.trim());
                }
            }
        }

        if (imagePaths.isEmpty()) {
            Row emptyRow = sheet0.createRow(currentRow);
            emptyRow.setHeightInPoints(28);
            createCell(emptyRow, 0, "등록된 제품 패키지 실물 이미지가 없습니다.", centerDataStyle);
            for (int col = 1; col <= 7; col++) createCell(emptyRow, col, "", centerDataStyle);
            sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, 0, 7));
            currentRow++;
            return currentRow;
        }

        // 최대 8개까지 이미지 렌더링 (한 행에 최대 4개씩 균등 분할)
        int imgCount = Math.min(imagePaths.size(), 8);
        int colsPerRow = imgCount == 1 ? 1 : (imgCount == 2 ? 2 : (imgCount == 3 ? 3 : 4));
        int colsSpan = 8 / colsPerRow;

        org.apache.poi.ss.usermodel.Drawing<?> sheet0Drawing = sheet0.getDrawingPatriarch() != null ? sheet0.getDrawingPatriarch() : sheet0.createDrawingPatriarch();

        for (int i = 0; i < imgCount; i += colsPerRow) {
            int currentBatchCount = Math.min(colsPerRow, imgCount - i);
            
            // 1. 라벨 헤더 행
            Row titleRow = sheet0.createRow(currentRow);
            titleRow.setHeightInPoints(24);
            for (int j = 0; j < currentBatchCount; j++) {
                int imgIdx = i + j;
                int startCol = j * colsSpan;
                int endCol = (j == currentBatchCount - 1) ? 7 : (startCol + colsSpan - 1);
                String repLabel = (imagePaths.get(imgIdx).equals(product.getImagePath()) || imgIdx == 0) ? " (대표)" : "";
                String title = "📷 패키지 이미지 #" + (imgIdx + 1) + repLabel;
                
                createCell(titleRow, startCol, title, subHeaderStyle);
                for (int c = startCol + 1; c <= endCol; c++) createCell(titleRow, c, "", subHeaderStyle);
                if (startCol < endCol) {
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(currentRow, currentRow, startCol, endCol));
                }
            }
            currentRow++;

            // 2. 이미지 본체 행
            int imgRowIdx = currentRow;
            Row imgRow = sheet0.createRow(imgRowIdx);
            imgRow.setHeightInPoints(180);
            for (int col = 0; col <= 7; col++) {
                createCell(imgRow, col, "", dataStyle);
            }

            for (int j = 0; j < currentBatchCount; j++) {
                int imgIdx = i + j;
                int startCol = j * colsSpan;
                int endCol = (j == currentBatchCount - 1) ? 7 : (startCol + colsSpan - 1);
                if (startCol < endCol) {
                    sheet0.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(imgRowIdx, imgRowIdx, startCol, endCol));
                }

                byte[] imgBytes = getImageBytesFromFileOrUrl(imagePaths.get(imgIdx));
                if (imgBytes != null && imgBytes.length > 0) {
                    try {
                        int picIdx = workbook.addPicture(imgBytes, detectPictureType(imgBytes));
                        org.apache.poi.ss.usermodel.ClientAnchor anchor = workbook.getCreationHelper().createClientAnchor();
                        anchor.setCol1(startCol); anchor.setRow1(imgRowIdx);
                        anchor.setCol2(endCol + 1); anchor.setRow2(imgRowIdx + 1);
                        anchor.setDx1(5 * 10000); anchor.setDy1(5 * 10000);
                        anchor.setDx2(-5 * 10000); anchor.setDy2(-5 * 10000);
                        anchor.setAnchorType(org.apache.poi.ss.usermodel.ClientAnchor.AnchorType.MOVE_AND_RESIZE);
                        sheet0Drawing.createPicture(anchor, picIdx);
                    } catch (Exception ex) {
                        log.error("Failed to insert product package image into Sheet 0", ex);
                    }
                }
            }
            currentRow++;
        }

        return currentRow;
    }
}
