package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class ManufacturerAuditService {

    private final ManufacturerAuditRepository auditRepository;
    private final AuditTemplateRepository templateRepository;
    private final SystemSettingRepository settingRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final ExcelExportService excelExportService;
    private final com.example.ims.repository.UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final ManufacturerAuditHistoryRepository historyRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<AuditTemplate> getAllTemplates() {
        List<AuditTemplate> templates = templateRepository.findAllByActiveTrueOrderByClassificationNameAsc();
        templates.forEach(t -> {
            if (t.getGroups() != null) {
                t.getGroups().forEach(g -> {
                    if (g.getItems() != null) g.getItems().size();
                });
            }
        });
        return templates;
    }

    @Transactional(readOnly = true)
    public AuditTemplate getTemplateById(Long id) {
        AuditTemplate template = templateRepository.findById(id).orElse(null);
        if (template != null) {
            // Explicitly initialize collections to prevent 500 LazyInitializationException
            template.getGroups().forEach(group -> {
                group.getItems().size(); // Trigger load
            });
        }
        return template;
    }

    @Transactional
    public AuditTemplate saveTemplate(AuditTemplate template) {
        // Ensure bidirectional relationship for JPA cascading
        if (template.getGroups() != null) {
            template.getGroups().forEach(group -> {
                group.setTemplate(template);
                if (group.getItems() != null) {
                    group.getItems().forEach(item -> {
                        item.setGroup(group);
                    });
                }
            });
        }
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<ManufacturerAudit> searchAudits(LocalDate startDate, LocalDate endDate, String manufacturerName) {
        List<ManufacturerAudit> audits = auditRepository.searchAudits(startDate, endDate, manufacturerName);
        audits.forEach(audit -> {
            if (audit.getManufacturer() != null) audit.getManufacturer().getName();
            if (audit.getTemplate() != null) {
                audit.getTemplate().getClassificationName();
                if (audit.getTemplate().getGroups() != null) {
                    audit.getTemplate().getGroups().forEach(g -> {
                        if (g.getItems() != null) g.getItems().size();
                    });
                }
            }
        });
        return audits;
    }

    @Transactional
    public ManufacturerAudit saveAudit(ManufacturerAudit audit) {
        return saveAuditWithUser(audit, audit.getModifierInfo());
    }

    @Transactional
    public ManufacturerAudit saveAuditWithUser(ManufacturerAudit audit, String username) {
        User user = userRepository.findByUsername(username != null ? username : "anonymous").orElse(null);
        ManufacturerAudit existing = null;
        if (audit.getId() != null) {
            existing = auditRepository.findById(audit.getId()).orElse(null);
        }

        // 1. Calculate Score & Grade
        calculateScoreAndGrade(audit);

        // 2. Set relationships
        if (audit.getResults() != null) {
            audit.getResults().forEach(result -> result.setAudit(audit));
        }
        if (audit.getGroupResults() != null) {
            audit.getGroupResults().forEach(result -> result.setAudit(audit));
        }

        // Capture old state BEFORE JPA merge updates the existing entity
        ManufacturerAudit oldAudit = new ManufacturerAudit();
        if (existing != null) {
            oldAudit.setId(existing.getId());
            oldAudit.setAuditDate(existing.getAuditDate());
            oldAudit.setAuditType(existing.getAuditType());
            oldAudit.setAuditor(existing.getAuditor());
            oldAudit.setTotalScore(existing.getTotalScore());
            oldAudit.setGrade(existing.getGrade());
            oldAudit.setPositiveFeedback(existing.getPositiveFeedback());
            oldAudit.setNegativeFeedback(existing.getNegativeFeedback());
            oldAudit.setFinalEvaluation(existing.getFinalEvaluation());
            
            if (existing.getGroupResults() != null) {
                List<ManufacturerAuditGroupResult> oldGrList = new ArrayList<>();
                for (ManufacturerAuditGroupResult gr : existing.getGroupResults()) {
                    ManufacturerAuditGroupResult copyGr = new ManufacturerAuditGroupResult();
                    copyGr.setGroup(gr.getGroup());
                    copyGr.setFeedback(gr.getFeedback());
                    oldGrList.add(copyGr);
                }
                oldAudit.setGroupResults(oldGrList);
            }
        }

        ManufacturerAudit saved = auditRepository.save(audit);

        // 3. Build Detailed Change List for Global Audit Log using the isolated old state
        List<java.util.Map<String, String>> changeDetails = new ArrayList<>();
        if (existing != null) {
            addChange(changeDetails, "AuditDate", oldAudit.getAuditDate() != null ? oldAudit.getAuditDate().toString() : "", saved.getAuditDate() != null ? saved.getAuditDate().toString() : "");
            addChange(changeDetails, "AuditType", oldAudit.getAuditType(), saved.getAuditType());
            addChange(changeDetails, "Auditor", oldAudit.getAuditor(), saved.getAuditor());
            addChange(changeDetails, "TotalScore", String.valueOf(oldAudit.getTotalScore()), String.valueOf(saved.getTotalScore()));
            addChange(changeDetails, "Grade", oldAudit.getGrade(), saved.getGrade());
            addChange(changeDetails, "PositiveFeedback", oldAudit.getPositiveFeedback(), saved.getPositiveFeedback());
            addChange(changeDetails, "NegativeFeedback", oldAudit.getNegativeFeedback(), saved.getNegativeFeedback());
            addChange(changeDetails, "FinalEvaluation", oldAudit.getFinalEvaluation(), saved.getFinalEvaluation());
            
            if (saved.getGroupResults() != null) {
                saved.getGroupResults().forEach(newGr -> {
                    if (newGr.getGroup() != null) {
                        Long gid = newGr.getGroup().getId();
                        String oldF = "";
                        if (oldAudit.getGroupResults() != null) {
                            ManufacturerAuditGroupResult oldGr = oldAudit.getGroupResults().stream()
                                    .filter(og -> og.getGroup() != null && gid.equals(og.getGroup().getId()))
                                    .findFirst().orElse(null);
                            if (oldGr != null) oldF = oldGr.getFeedback();
                        }
                        addChange(changeDetails, "GroupFeedback:" + newGr.getGroup().getGroupName(), oldF, newGr.getFeedback());
                    }
                });
            }
            
            // Record to local History Tab
            recordAuditHistory(oldAudit, saved, user);
        }
        
        // [감사 로그] Global Audit Log
        String company = (user != null && user.getCompanyName() != null) ? user.getCompanyName() : "시스템";
        String modifierName = (user != null) ? user.getName() + " (" + company + ")" : "시스템";
        
        String detailJson = "[]";
        try {
            detailJson = objectMapper.writeValueAsString(changeDetails);
        } catch (Exception e) { /* ignore */ }

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("MANUFACTURER_AUDIT")
                .entityId(saved.getId())
                .action(existing == null ? "CREATE" : "UPDATE")
                .modifier(modifierName)
                .modifierId(user != null ? user.getId() : null)
                .modifierUsername(username)
                .modifierName(user != null ? user.getName() : null)
                .modifierCompany(user != null ? user.getCompanyName() : null)
                .description((existing == null ? "제조사 Audit 등록: " : "제조사 Audit 수정: ") + 
                             (saved.getManufacturer() != null ? saved.getManufacturer().getName() : "ID " + saved.getId()))
                .oldEntity(existing != null ? auditLogService.toCompactJson(existing) : "-")
                .newEntity(auditLogService.toCompactJson(saved))
                .changeDetail(detailJson)
                .build());

        // Force initialize lazy proxies
        if (saved.getTemplate() != null) saved.getTemplate().getClassificationName();
        if (saved.getManufacturer() != null) saved.getManufacturer().getName();
        
        saved.getPositivePhotos().size();
        saved.getNegativePhotos().size();
        saved.getGroupResults().size();
        
        return saved;
    }

    private void addChange(List<java.util.Map<String, String>> list, String field, String oldV, String newV) {
        String o = (oldV == null) ? "" : oldV.trim();
        String n = (newV == null) ? "" : newV.trim();
        if (!o.equals(n)) {
            java.util.Map<String, String> m = new java.util.HashMap<>();
            m.put("field", field);
            m.put("oldValue", o);
            m.put("newValue", n);
            list.add(m);
        }
    }

    private void recordAuditHistory(ManufacturerAudit oldA, ManufacturerAudit newA, User user) {
        compareAndSave(oldA.getId(), user, "AuditDate", 
                oldA.getAuditDate() != null ? oldA.getAuditDate().toString() : "", 
                newA.getAuditDate() != null ? newA.getAuditDate().toString() : "");
        compareAndSave(oldA.getId(), user, "AuditType", oldA.getAuditType(), newA.getAuditType());
        compareAndSave(oldA.getId(), user, "Auditor", oldA.getAuditor(), newA.getAuditor());
        compareAndSave(oldA.getId(), user, "TotalScore", String.valueOf(oldA.getTotalScore()), String.valueOf(newA.getTotalScore()));
        compareAndSave(oldA.getId(), user, "Grade", oldA.getGrade(), newA.getGrade());
        compareAndSave(oldA.getId(), user, "PositiveFeedback", oldA.getPositiveFeedback(), newA.getPositiveFeedback());
        compareAndSave(oldA.getId(), user, "NegativeFeedback", oldA.getNegativeFeedback(), newA.getNegativeFeedback());
        compareAndSave(oldA.getId(), user, "FinalEvaluation", oldA.getFinalEvaluation(), newA.getFinalEvaluation());

        // Group Feedbacks History
        if (newA.getGroupResults() != null) {
            newA.getGroupResults().forEach(newGr -> {
                if (newGr.getGroup() != null) {
                    Long gid = newGr.getGroup().getId();
                    ManufacturerAuditGroupResult oldGr = oldA.getGroupResults().stream()
                        .filter(og -> og.getGroup() != null && gid.equals(og.getGroup().getId()))
                        .findFirst().orElse(null);
                    String oldF = (oldGr != null) ? oldGr.getFeedback() : "";
                    compareAndSave(oldA.getId(), user, "GroupFeedback:" + newGr.getGroup().getGroupName(), oldF, newGr.getFeedback());
                }
            });
        }
    }

    private void compareAndSave(Long auditId, User user, String field, String oldVal, String newVal) {
        String nOld = (oldVal == null) ? "" : oldVal.trim();
        String nNew = (newVal == null) ? "" : newVal.trim();

        if (!nOld.equals(nNew)) {
            String company = user.getCompanyName() != null ? user.getCompanyName() : "시스템";
            String modifierName = user.getName() + " (" + company + ")";
            historyRepository.save(ManufacturerAuditHistory.builder()
                    .auditId(auditId)
                    .modifier(modifierName)
                    .modifierId(user.getId())
                    .modifierUsername(user.getUsername())
                    .modifierName(user.getName())
                    .modifierCompany(user.getCompanyName())
                    .fieldName(field)
                    .oldValue(nOld)
                    .newValue(nNew)
                    .build());
        }
    }

    public List<ManufacturerAuditHistory> getAuditHistory(Long auditId) {
        return historyRepository.findByAuditIdOrderByModifiedAtDesc(auditId);
    }

    private void calculateScoreAndGrade(ManufacturerAudit audit) {
        if (audit.getResults() == null || audit.getResults().isEmpty()) {
            audit.setTotalScore(0);
            audit.setGrade("F");
            return;
        }

        int totalScore = audit.getResults().stream().mapToInt(ManufacturerAuditResult::getScore).sum();
        int maxPossible = audit.getResults().size() * 5;
        
        double percentage = (maxPossible > 0) ? (double) totalScore / maxPossible * 100 : 0;
        audit.setTotalScore((int) Math.round(percentage));

        // [고도화] 그룹별 점수 계산 로직 (필요 시 gr 객체에 데이터 저장 가능)
        // 현재는 프론트엔드에서 실시간으로 계산하여 표시함

        // Load dynamic thresholds
        int thresholdA = 90, thresholdB = 80, thresholdC = 70, thresholdD = 60;
        try {
            SystemSetting setting = settingRepository.findById("AUDIT_GRADE_THRESHOLDS").orElse(null);
            if (setting != null) {
                com.fasterxml.jackson.databind.JsonNode nodes = objectMapper.readTree(setting.getSettingValue());
                thresholdA = nodes.get("A").asInt();
                thresholdB = nodes.get("B").asInt();
                thresholdC = nodes.get("C").asInt();
                thresholdD = nodes.get("D").asInt();
            }
        } catch (Exception e) {
            // Fallback to defaults
        }

        if (percentage >= thresholdA) audit.setGrade("A");
        else if (percentage >= thresholdB) audit.setGrade("B");
        else if (percentage >= thresholdC) audit.setGrade("C");
        else if (percentage >= thresholdD) audit.setGrade("D");
        else audit.setGrade("F");
    }

    public void deleteAudit(Long id) {
        auditRepository.deleteById(id);
    }
    
    public void deleteTemplate(Long id) {
        templateRepository.findById(id).ifPresent(t -> {
            t.setActive(false);
            templateRepository.save(t);
        });
    }

    /**
     * [고도화 12] Audit 결과를 PDF로 생성합니다.
     */
    /*
    @Transactional(readOnly = true)
    public byte[] generateAuditPdf(Long id) throws Exception {
        ... (omitted for brevity in replacement but I will use the actual code to comment out)
    }
    */

    /**
     * [고도화 12] Audit 결과를 Excel로 생성합니다.
     */
    @Transactional(readOnly = true)
    public byte[] generateAuditExcel(Long id) throws Exception {
        ManufacturerAudit audit = auditRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Audit not found"));

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            Sheet sheet = workbook.createSheet("Audit Report");
            sheet.setDisplayGridlines(false); 

            int rowIdx = 0;

            // --- 스타일 정의 ---
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 20);
            titleFont.setUnderline(Font.U_SINGLE);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle labelStyle = workbook.createCellStyle();
            Font labelFont = workbook.createFont();
            labelFont.setBold(true);
            labelStyle.setFont(labelFont);
            labelStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            labelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            labelStyle.setBorderTop(BorderStyle.THIN);
            labelStyle.setBorderBottom(BorderStyle.THIN);
            labelStyle.setBorderLeft(BorderStyle.THIN);
            labelStyle.setBorderRight(BorderStyle.THIN);
            labelStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle valueStyle = workbook.createCellStyle();
            valueStyle.setBorderTop(BorderStyle.THIN);
            valueStyle.setBorderBottom(BorderStyle.THIN);
            valueStyle.setBorderLeft(BorderStyle.THIN);
            valueStyle.setBorderRight(BorderStyle.THIN);
            valueStyle.setWrapText(true);

            CellStyle groupStyle = workbook.createCellStyle();
            Font groupFont = workbook.createFont();
            groupFont.setBold(true);
            groupFont.setFontHeightInPoints((short) 12);
            groupStyle.setFont(groupFont);
            groupStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
            groupStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            groupStyle.setBorderTop(BorderStyle.MEDIUM);
            groupStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dataStyle.setWrapText(true);

            CellStyle centerDataStyle = workbook.createCellStyle();
            centerDataStyle.cloneStyleFrom(dataStyle);
            centerDataStyle.setAlignment(HorizontalAlignment.CENTER);

            // --- 리포트 구성 ---
            
            // 1. 메인 제목
            Row titleRow = sheet.createRow(rowIdx++);
            titleRow.setHeightInPoints(40);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("제조업체 정기 점검 보고서");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 4));
            rowIdx++;

            // 2. 기본 정보 테이블
            String manufacturerName = audit.getManufacturer() != null ? audit.getManufacturer().getName() : "N/A";
            String auditDateStr = audit.getAuditDate() != null ? audit.getAuditDate().toString() : "N/A";
            String auditType = audit.getAuditType() != null ? audit.getAuditType() : "N/A";
            String modifier = audit.getModifierInfo() != null ? audit.getModifierInfo() : "N/A";
            String templateName = audit.getTemplate() != null ? audit.getTemplate().getClassificationName() : "N/A";
            String resultStr = (audit.getGrade() != null ? audit.getGrade() : "-") + "등급 (" + audit.getTotalScore() + "%)";

            String[][] summaryData = {
                {"점검 대상 업체", manufacturerName, "점검 일자", auditDateStr},
                {"점검 구분", auditType, "작성자", modifier},
                {"점검 양식", templateName, "등급/점수", resultStr}
            };

            for (String[] data : summaryData) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(25);
                for (int i = 0; i < 4; i++) {
                    Cell cell = row.createCell(i);
                    cell.setCellValue(data[i]);
                    cell.setCellStyle(i % 2 == 0 ? labelStyle : valueStyle);
                }
            }
            rowIdx += 2;

            // 3. 점검 상세 항목
            Row headerRow = sheet.createRow(rowIdx++);
            headerRow.setHeightInPoints(30);
            String[] headers = {"번호", "점검 항목 및 세부 내용", "배점", "득점", "평가 의견 및 부적합 내역"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int itemNo = 1;
            if (audit.getTemplate() != null && audit.getTemplate().getGroups() != null) {
                for (AuditTemplateGroup group : audit.getTemplate().getGroups()) {
                    if (group == null) continue;

                    // 그룹 헤더
                    Row gRow = sheet.createRow(rowIdx++);
                    gRow.setHeightInPoints(25);
                    Cell gCell = gRow.createCell(0);
                    gCell.setCellValue("■ " + (group.getGroupName() != null ? group.getGroupName() : "그룹명 없음"));
                    gCell.setCellStyle(groupStyle);
                    sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx-1, rowIdx-1, 0, 4));

                    // 항목 리스트
                    final Long currentGroupId = group.getId();
                    List<ManufacturerAuditResult> groupItems = new ArrayList<>();
                    if (audit.getResults() != null) {
                        groupItems = audit.getResults().stream()
                            .filter(r -> r != null && r.getItem() != null && r.getItem().getGroup() != null && 
                                         currentGroupId != null && currentGroupId.equals(r.getItem().getGroup().getId()))
                            .toList();
                    }

                    for (ManufacturerAuditResult result : groupItems) {
                        Row row = sheet.createRow(rowIdx++);
                        row.setHeightInPoints(35);
                        
                        Cell c0 = row.createCell(0);
                        c0.setCellValue(itemNo++);
                        c0.setCellStyle(centerDataStyle);

                        Cell c1 = row.createCell(1);
                        c1.setCellValue(result.getItem() != null ? result.getItem().getItemContent() : "-");
                        c1.setCellStyle(dataStyle);

                        Cell c2 = row.createCell(2);
                        c2.setCellValue(5); 
                        c2.setCellStyle(centerDataStyle);

                        Cell c3 = row.createCell(3);
                        c3.setCellValue(result.getScore());
                        c3.setCellStyle(centerDataStyle);

                        Cell c4 = row.createCell(4);
                        c4.setCellValue(result.getRemarks() != null ? result.getRemarks() : "");
                        c4.setCellStyle(dataStyle);
                    }

                    // 그룹 총평
                    String feedback = "";
                    if (audit.getGroupResults() != null && currentGroupId != null) {
                        feedback = audit.getGroupResults().stream()
                            .filter(gr -> gr != null && gr.getGroup() != null && currentGroupId.equals(gr.getGroup().getId()))
                            .map(ManufacturerAuditGroupResult::getFeedback)
                            .findFirst().orElse("");
                    }
                    
                    Row fRow = sheet.createRow(rowIdx++);
                    fRow.setHeightInPoints(30);
                    Cell fCell = fRow.createCell(1);
                    fCell.setCellValue(" ▶ 그룹 평가 의견: " + (feedback == null || feedback.isEmpty() ? "(특이사항 없음)" : feedback));
                    
                    CellStyle feedbackBoxStyle = workbook.createCellStyle();
                    feedbackBoxStyle.cloneStyleFrom(dataStyle);
                    feedbackBoxStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
                    feedbackBoxStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                    Font italicFont = workbook.createFont();
                    italicFont.setItalic(true);
                    feedbackBoxStyle.setFont(italicFont);
                    fCell.setCellStyle(feedbackBoxStyle);
                    
                    sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx-1, rowIdx-1, 1, 4));
                    rowIdx++; 
                }
            }

            // 4. 종합 평가
            rowIdx++;
            Row finalTitleRow = sheet.createRow(rowIdx++);
            Cell ftCell = finalTitleRow.createCell(0);
            ftCell.setCellValue("종합 평가 및 개선 요청 사항");
            ftCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx-1, rowIdx-1, 0, 4));

            Row finalEvalRow = sheet.createRow(rowIdx++);
            finalEvalRow.setHeightInPoints(80);
            Cell feCell = finalEvalRow.createCell(0);
            feCell.setCellValue(audit.getFinalEvaluation() != null ? audit.getFinalEvaluation() : "");
            feCell.setCellStyle(dataStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx-1, rowIdx-1, 0, 4));

            // 5. 서명란
            rowIdx += 3;
            Row signRow = sheet.createRow(rowIdx++);
            signRow.setHeightInPoints(30);
            Cell signCell = signRow.createCell(3);
            signCell.setCellValue("점검자: ________________ (서명)");
            CellStyle signStyle = workbook.createCellStyle();
            Font signFont = workbook.createFont();
            signFont.setBold(true);
            signStyle.setFont(signFont);
            signCell.setCellStyle(signStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx-1, rowIdx-1, 3, 4));

            // 컬럼 너비 설정
            sheet.setColumnWidth(0, 2000);
            sheet.setColumnWidth(1, 18000);
            sheet.setColumnWidth(2, 2000);
            sheet.setColumnWidth(3, 2000);
            sheet.setColumnWidth(4, 12000);
            
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * [고도화 12] 검색된 Audit 목록을 Excel로 내보냅니다.
     */
    public byte[] exportAuditsExcel(LocalDate startDate, LocalDate endDate, String manufacturerName, String username) throws java.io.IOException {
        List<ManufacturerAudit> data = searchAudits(startDate, endDate, manufacturerName);
        
        // [감사 로그] 엑셀 다운로드 이력 기록
        User userObj = userRepository.findByUsername(username).orElse(null);
        String modifierName = username;
        Long modifierId = null;
        String modifierNameOnly = null;
        String modifierCompany = null;
        
        if (userObj != null) {
            modifierName = userObj.getName() + " (" + (userObj.getCompanyName() != null ? userObj.getCompanyName() : "시스템") + ")";
            modifierId = userObj.getId();
            modifierNameOnly = userObj.getName();
            modifierCompany = userObj.getCompanyName();
        }

        eventPublisher.publishEvent(com.example.ims.event.EntityChangeEvent.builder()
                .entityType("MANUFACTURER_AUDIT")
                .entityId(0L)
                .action("EXPORT")
                .modifier(modifierName)
                .modifierId(modifierId)
                .modifierUsername(username)
                .modifierName(modifierNameOnly)
                .modifierCompany(modifierCompany)
                .description("제조사 Audit 목록 엑셀 다운로드 수행 (내역: " + data.size() + "건)")
                .build());

        String[] headers = {
            "ID", "제조사", "평가일자", "유형", "총점", "등급", "긍정피드백", "부정피드백", "최종평가"
        };
        
        return excelExportService.exportToExcel("제조사Audit목록", headers, data, a -> new Object[]{
            a.getId(),
            a.getManufacturer() != null ? a.getManufacturer().getName() : "-",
            a.getAuditDate() != null ? a.getAuditDate().toString() : "-",
            a.getAuditType(),
            a.getTotalScore(),
            a.getGrade(),
            a.getPositiveFeedback(),
            a.getNegativeFeedback(),
            a.getFinalEvaluation()
        });
    }
}
