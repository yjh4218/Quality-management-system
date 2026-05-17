package com.example.ims.service;

import com.example.ims.entity.RegulatoryIngredient;
import com.example.ims.entity.IngredientLimitDetail;
import com.example.ims.repository.RegulatoryIngredientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.springframework.http.converter.StringHttpMessageConverter;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class RegulatoryCrawlerService {

    private final RegulatoryIngredientRepository repository;
    private final RestTemplate restTemplate = createRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    private static RestTemplate createRestTemplate() {
        // [FIX] 타임아웃 설정 추가 - 배포 환경에서 무한 대기 방지
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000); // 30초 연결 타임아웃
        factory.setReadTimeout(60000);    // 60초 읽기 타임아웃
        RestTemplate rt = new RestTemplate(factory);
        rt.getMessageConverters().removeIf(converter -> converter instanceof StringHttpMessageConverter);
        rt.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));
        return rt;
    }

    /**
     * API 호출 재시도 로직 (최대 3회, 실패 시 HTTP 폴백 포함)
     */
    private String callApiWithRetry(String urlString, int maxRetries) {
        Exception lastException = null;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return restTemplate.getForObject(urlString, String.class);
            } catch (Exception e) {
                lastException = e;
                log.warn(">>>> [CRAWLER] API call attempt {}/{} failed: {} - {}", attempt, maxRetries, e.getClass().getSimpleName(), e.getMessage());
                if (attempt == 1 && urlString.startsWith("https://")) {
                    // 첫 번째 시도 실패 시 HTTP 폴백 시도
                    urlString = urlString.replace("https://", "http://");
                    log.info(">>>> [CRAWLER] Falling back to HTTP...");
                }
                if (attempt < maxRetries) {
                    try { Thread.sleep(2000L * attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                }
            }
        }
        throw new RuntimeException("API call failed after " + maxRetries + " attempts", lastException);
    }
    
    // Sync status flag
    private final java.util.concurrent.atomic.AtomicBoolean isSyncing = new java.util.concurrent.atomic.AtomicBoolean(false);

    private static final String SERVICE_KEY = "3f76de32c189ceca588b1e5482c91ce247e0e07b56778bd48a90aca9039a6932";
    private static final String REGL_API_URL = "https://apis.data.go.kr/1471000/CsmtcsReglMaterialInfoService/getCsmtcsReglMaterialInfoService";
    private static final String INGD_API_URL = "https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService01";

    public void init() {
        long count = repository.count();
        if (count == 0) {
            log.info(">>>> [INIT] Database is empty. Seeding initial regulatory data...");
            runWeeklyUpdate();
        } else {
            log.info(">>>> [INIT] Existing regulatory data found ({} records). Skipping automatic startup sync.", count);
        }
    }

    @Scheduled(cron = "0 0 3 * * SUN")
    @Transactional
    public void runWeeklyUpdate() {
        syncByCountries(List.of("KR", "EU", "US", "CN", "JP"));
    }

    public void syncByCountries(List<String> countries) {
        if (isSyncing.get()) {
            log.warn(">>>> [BATCH] Sync already in progress. Skipping.");
            throw new IllegalStateException("데이터 동기화가 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.");
        }
        
        isSyncing.set(true);
        try {
            log.info(">>>> [BATCH] Starting Regulatory Data Update for: {}", countries);
            
            // [FIX] Full Reload 전략: 전체 동기화 전 기존 API 데이터 삭제
            if (countries.contains("KR") || countries.contains("kr") || countries.contains("Kr")) {
                log.info(">>>> [BATCH] Cleaning up old REGL and INGD data...");
                repository.deleteBySourceApi("REGL");
                repository.deleteBySourceApi("INGD");
            }

            // 1. Sync specific countries sequentially to prevent parallel SELECT-INSERT race conditions and duplicate key exceptions
            for (String country : countries) {
                try {
                    log.info(">>>> [BATCH] Processing country: {}", country);
                    switch (country.toUpperCase()) {
                        case "KR": updateKoreaRegulations(); break;
                        case "EU": updateEURegulations(); break;
                        case "US": updateUSRegulations(); break;
                        case "CN": updateChinaRegulations(); break;
                        case "JP": updateJapanRegulations(); break;
                    }
                } catch (Exception e) {
                    log.error("Failed to sync regulations for country: " + country, e);
                }
            }
            
            // 2. Enforce Global Prohibitions (Safety Override)
            enforceGlobalProhibitions();
            
            log.info(">>>> [BATCH] Regulatory Data Update Completed.");
        } finally {
            isSyncing.set(false);
        }
    }

    public boolean isSyncing() {
        return isSyncing.get();
    }

    private void enforceGlobalProhibitions() {
        log.info(">>>> [CRAWLER] Enforcing Global Prohibitions for Toxic Substances...");
        String[] toxicSubstances = {"Mercury", "Lead", "Cadmium", "Arsenic", "Formaldehyde"};
        String[] toxicKoreanNames = {"수은", "납", "카드뮴", "비소", "포름알데히드"};
        
        for (int i = 0; i < toxicSubstances.length; i++) {
            saveAsGlobalProhibited(toxicSubstances[i], toxicKoreanNames[i]);
        }
    }

    private void saveAsGlobalProhibited(String inciName, String koreanName) {
        List<RegulatoryIngredient> existingList = repository.findByInciName(inciName);
        RegulatoryIngredient ingredient;
        if (existingList.isEmpty()) {
            ingredient = RegulatoryIngredient.builder()
                .inciName(inciName)
                .koreanName(koreanName)
                .sourceApi("MANUAL")
                .build();
        } else {
            ingredient = existingList.get(0); // 첫 번째 항목 업데이트
        }
        
        if (koreanName != null) ingredient.setKoreanName(koreanName);
        
        ingredient.setKrStatus("PROHIBITED"); ingredient.setKrLimit(0.0);
        ingredient.setEuStatus("PROHIBITED"); ingredient.setEuLimit(0.0);
        ingredient.setUsStatus("PROHIBITED"); ingredient.setUsLimit(0.0);
        ingredient.setCnStatus("PROHIBITED"); ingredient.setCnLimit(0.0);
        ingredient.setJpStatus("PROHIBITED"); ingredient.setJpLimit(0.0);
        
        repository.save(ingredient);
    }

    private void updateKoreaRegulations() {
        try {
            log.info(">>>> [CRAWLER] Syncing Korea (MFDS) Regulations via Open API...");
            
            int pageNo = 1;
            int totalCount = 1; // Initial dummy value
            int numOfRows = 100; // Batch size
            int savedCount = 0;
            int skippedCount = 0;
            int errorCount = 0;
            int consecutiveErrors = 0; // 연속 에러 카운터

            while ((pageNo - 1) * numOfRows < totalCount) {
                try {
                    String urlString = String.format("%s?serviceKey=%s&type=json&pageNo=%d&numOfRows=%d", 
                            REGL_API_URL, SERVICE_KEY, pageNo, numOfRows);
                    
                    String response = callApiWithRetry(urlString, 3);

                    JsonNode root = objectMapper.readTree(response);
                    JsonNode body = root.path("body");
                    
                    // API 응답 유효성 검증
                    if (body.isMissingNode() || body.isNull()) {
                        log.error(">>>> [CRAWLER] REGL API returned invalid response at page {}. Raw: {}", pageNo, 
                                response != null ? response.substring(0, Math.min(200, response.length())) : "null");
                        consecutiveErrors++;
                        if (consecutiveErrors >= 5) {
                            log.error(">>>> [CRAWLER] 5 consecutive errors. Aborting REGL sync.");
                            break;
                        }
                        pageNo++;
                        continue;
                    }
                    
                    totalCount = body.path("totalCount").asInt();
                    JsonNode items = body.path("items");
                    
                    if (pageNo == 1) {
                        log.info(">>>> [CRAWLER] REGL API totalCount = {} (총 {}페이지 예상)", totalCount, (int) Math.ceil((double) totalCount / numOfRows));
                    }

                    if (items.isArray() && items.size() > 0) {
                        consecutiveErrors = 0; // 성공 시 연속 에러 리셋
                        for (JsonNode item : items) {
                            try {
                                String engName = item.path("INGR_ENG_NAME").asText();
                                String korName = item.path("INGR_STD_NAME").asText();
                                String prohNational = item.path("PROH_NATIONAL").asText();
                                String limitNational = item.path("LIMIT_NATIONAL").asText();
                                String limitContent = item.path("LIMIT_CONTENT").asText();
                                String useRange = item.path("USE_RANGE").asText();
                                String cas = item.path("CAS_NO").asText();

                                String detailedRemarks = "";
                                if (limitContent != null && !limitContent.equals("null") && !limitContent.isEmpty()) {
                                    detailedRemarks += "[한도상세] " + limitContent + " ";
                                }
                                if (useRange != null && !useRange.equals("null") && !useRange.isEmpty()) {
                                    detailedRemarks += "[사용범위] " + useRange;
                                }

                                if (engName == null || engName.isEmpty() || "null".equalsIgnoreCase(engName)) {
                                    engName = korName;
                                }

                                if (engName != null && !engName.isEmpty() && !"null".equalsIgnoreCase(engName)) {
                                    saveKoreaRegulationAtomic(engName, korName, cas, detailedRemarks, prohNational, limitNational);
                                    savedCount++;
                                } else {
                                    skippedCount++;
                                }
                            } catch (Exception e) {
                                errorCount++;
                                log.warn(">>>> [CRAWLER] REGL item save error at page {}: {}", pageNo, e.getMessage());
                            }
                        }
                    } else {
                        log.warn(">>>> [CRAWLER] No items returned for REGL page {}. Stopping.", pageNo);
                        break;
                    }
                } catch (Exception e) {
                    log.error(">>>> [CRAWLER] REGL page {} fetch failed: {} - {}", pageNo, e.getClass().getSimpleName(), e.getMessage());
                    consecutiveErrors++;
                    errorCount++;
                    if (consecutiveErrors >= 5) {
                        log.error(">>>> [CRAWLER] 5 consecutive page errors. Aborting REGL sync at page {}.", pageNo);
                        break;
                    }
                }
                
                if (pageNo % 10 == 0) {
                    log.info(">>>> [CRAWLER] REGL Progress: page {}, processed {}/{}, saved={}, skipped={}, errors={}", 
                            pageNo, Math.min(pageNo * numOfRows, totalCount), totalCount, savedCount, skippedCount, errorCount);
                }
                pageNo++;
                
                if (pageNo > 300) break; // Limit to 30,000 items
            }
            
            log.info(">>>> [CRAWLER] ===== REGL API Sync COMPLETED =====");
            log.info(">>>> [CRAWLER] REGL totalCount={}, pages={}, saved={}, skipped={}, errors={}", 
                    totalCount, pageNo - 1, savedCount, skippedCount, errorCount);
            
            // 2. Fetch full ingredient master
            updateKoreaIngredientMaster();
            
        } catch (Exception e) {
            log.error(">>>> [CRAWLER] CRITICAL: updateKoreaRegulations failed entirely", e);
        }
    }

    /**
     * [FIX] 하나의 성분에 대해 remarks + 국가 규제 상태 + limitDetails를 단 한 번의 save()로 원자적 처리.
     * 이전에는 saveOrUpdateRemarks() → saveOrUpdate() × N 으로 여러 번 save()하면서
     * limitDetails가 소멸되는 문제가 있었음.
     */
    private void saveKoreaRegulationAtomic(String inciName, String koreanName, String cas, String remarks, String prohNational, String limitNational) {
        // [FIX] 중복 병합 제거: 매 건마다 새로운 엔티티 생성 (Full Reload)
        RegulatoryIngredient ingredient = RegulatoryIngredient.builder()
                .inciName(inciName)
                .koreanName(koreanName)
                .casNumber(cas)
                .sourceApi("REGL")
                .build();

        // 1. Remarks + LimitDetails 설정
        if (remarks != null && !remarks.isEmpty()) {
            ingredient.setRemarks(remarks);
            parseAndSaveDetails(ingredient, remarks);
        }

        // 2. 국가별 규제 상태 설정
        if (prohNational != null && !prohNational.isEmpty() && !"null".equalsIgnoreCase(prohNational)) {
            if (prohNational.contains("한국")) { ingredient.setKrStatus("PROHIBITED"); ingredient.setKrLimit(0.0); }
            if (prohNational.contains("EU"))   { ingredient.setEuStatus("PROHIBITED"); ingredient.setEuLimit(0.0); }
            if (prohNational.contains("중국")) { ingredient.setCnStatus("PROHIBITED"); ingredient.setCnLimit(0.0); }
            if (prohNational.contains("미국")) { ingredient.setUsStatus("PROHIBITED"); ingredient.setUsLimit(0.0); }
            if (prohNational.contains("일본")) { ingredient.setJpStatus("PROHIBITED"); ingredient.setJpLimit(0.0); }
        }
        if (limitNational != null && !limitNational.isEmpty() && !"null".equalsIgnoreCase(limitNational)) {
            if (limitNational.contains("한국")) ingredient.setKrStatus("RESTRICTED");
            if (limitNational.contains("EU"))   ingredient.setEuStatus("RESTRICTED");
            if (limitNational.contains("중국")) ingredient.setCnStatus("RESTRICTED");
            if (limitNational.contains("미국")) ingredient.setUsStatus("RESTRICTED");
            if (limitNational.contains("일본")) ingredient.setJpStatus("RESTRICTED");
        }

        // 3. 단 한 번의 save()로 원자적 저장
        repository.save(ingredient);
    }

    private void updateKoreaIngredientMaster() {
        try {
            log.info(">>>> [CRAWLER] Syncing Full Korea Ingredient Master via API...");
            
            int pageNo = 1;
            int totalCount = 1;
            int numOfRows = 100;
            int savedCount = 0;
            int skippedCount = 0;
            int errorCount = 0;
            int consecutiveErrors = 0;

            while ((pageNo - 1) * numOfRows < totalCount) {
                try {
                    String urlString = String.format("%s?serviceKey=%s&type=json&pageNo=%d&numOfRows=%d", 
                            INGD_API_URL, SERVICE_KEY, pageNo, numOfRows);
                    
                    String response = callApiWithRetry(urlString, 3);

                    JsonNode root = objectMapper.readTree(response);
                    JsonNode body = root.path("body");
                    
                    if (body.isMissingNode() || body.isNull()) {
                        log.error(">>>> [CRAWLER] INGD API returned invalid response at page {}.", pageNo);
                        consecutiveErrors++;
                        if (consecutiveErrors >= 5) {
                            log.error(">>>> [CRAWLER] 5 consecutive errors. Aborting INGD sync.");
                            break;
                        }
                        pageNo++;
                        continue;
                    }
                    
                    totalCount = body.path("totalCount").asInt();
                    JsonNode items = body.path("items");
                    
                    if (pageNo == 1) {
                        log.info(">>>> [CRAWLER] INGD API totalCount = {} (총 {}페이지 예상)", totalCount, (int) Math.ceil((double) totalCount / numOfRows));
                    }

                    if (items.isArray() && items.size() > 0) {
                        consecutiveErrors = 0;
                        for (JsonNode item : items) {
                            try {
                                String engName = item.path("INGR_ENG_NAME").asText();
                                String korName = item.path("INGR_KOR_NAME").asText();
                                String cas = item.path("CAS_NO").asText();
                                String originText = item.path("ORIGIN_MAJOR_KOR_NAME").asText();
                                String synonymText = item.path("INGR_SYNONYM").asText();
                                
                                if (engName == null || engName.isEmpty() || "null".equalsIgnoreCase(engName)) {
                                    engName = korName;
                                }
                                
                                // INCI명이 없어도 저장 허용
                                RegulatoryIngredient ingredient = RegulatoryIngredient.builder()
                                        .inciName("null".equalsIgnoreCase(engName) ? null : engName)
                                        .koreanName(korName)
                                        .casNumber(cas)
                                        .sourceApi("INGD")
                                        .origin("null".equalsIgnoreCase(originText) ? null : originText)
                                        .synonym("null".equalsIgnoreCase(synonymText) ? null : synonymText)
                                        .krStatus("ALLOWED")
                                        .build();
                                repository.save(ingredient);
                                savedCount++;
                            } catch (Exception e) {
                                errorCount++;
                                log.warn(">>>> [CRAWLER] INGD item save error at page {}: {}", pageNo, e.getMessage());
                            }
                        }
                    } else {
                        log.warn(">>>> [CRAWLER] No items returned for INGD page {}. Stopping.", pageNo);
                        break;
                    }
                } catch (Exception e) {
                    log.error(">>>> [CRAWLER] INGD page {} fetch failed: {} - {}", pageNo, e.getClass().getSimpleName(), e.getMessage());
                    consecutiveErrors++;
                    errorCount++;
                    if (consecutiveErrors >= 5) {
                        log.error(">>>> [CRAWLER] 5 consecutive page errors. Aborting INGD sync at page {}.", pageNo);
                        break;
                    }
                }
                
                if (pageNo % 10 == 0) {
                    log.info(">>>> [CRAWLER] INGD Progress: page {}, processed {}/{}, newSaved={}, existing={}, errors={}", 
                            pageNo, Math.min(pageNo * numOfRows, totalCount), totalCount, savedCount, skippedCount, errorCount);
                }
                pageNo++;
                
                if (pageNo > 300) break;
            }
            
            long dbTotal = repository.count();
            log.info(">>>> [CRAWLER] ===== INGD Master Sync COMPLETED =====");
            log.info(">>>> [CRAWLER] INGD totalCount={}, pages={}, newSaved={}, existing={}, errors={}", 
                    totalCount, pageNo - 1, savedCount, skippedCount, errorCount);
            log.info(">>>> [CRAWLER] DB Total records after sync: {}", dbTotal);
        } catch (Exception e) {
            log.error(">>>> [CRAWLER] CRITICAL: updateKoreaIngredientMaster failed entirely", e);
        }
    }

    private void saveIfNew(String inciName, String koreanName, String cas, String country) {
        Optional<RegulatoryIngredient> existing = repository.findByInciName(inciName);
        if (existing.isEmpty()) {
            saveOrUpdate(inciName, koreanName, cas, "ALLOWED", null, country);
        }
    }

    private void updateEURegulations() {
        try {
            log.info(">>>> [CRAWLER] Syncing EU (CosIng) Regulations...");
            saveOrUpdate("Phenoxyethanol", "페녹시에탄올", "122-99-6", "RESTRICTED", 1.0, "EU"); 
            saveOrUpdate("Salicylic Acid", "살리실릭애씨드", "69-72-7", "RESTRICTED", 0.5, "EU");
            saveOrUpdate("Titanium Dioxide", "티타늄디옥사이드", "13463-67-7", "RESTRICTED", 25.0, "EU");
            saveOrUpdate("Zinc Oxide", "징크옥사이드", "1314-13-2", "RESTRICTED", 25.0, "EU");
            saveOrUpdate("Alpha-Arbutin", "알파-알부틴", "84380-01-8", "RESTRICTED", 2.0, "EU");
            saveOrUpdate("Triclosan", "트리클로산", "3380-34-5", "RESTRICTED", 0.3, "EU");
            saveOrUpdate("Methylisothiazolinone", "메틸이소치아졸리논", "2682-20-4", "PROHIBITED", 0.0, "EU");
        } catch (Exception e) {
            log.error("Failed to sync EU regulations", e);
        }
    }

    private void updateUSRegulations() {
        try {
            log.info(">>>> [CRAWLER] Syncing USA (FDA) Regulations...");
            saveOrUpdate("Phenoxyethanol", "페녹시에탄올", "122-99-6", "ALLOWED", null, "US");
            saveOrUpdate("Paraben", "파라벤", null, "RESTRICTED", 0.4, "US");
            saveOrUpdate("Salicylic Acid", "살리실릭애씨드", "69-72-7", "ALLOWED", 2.0, "US");
            saveOrUpdate("Benzophenone-3", "벤조페논-3", "131-57-7", "ALLOWED", 6.0, "US");
            saveOrUpdate("Titanium Dioxide", "티타늄디옥사이드", "13463-67-7", "ALLOWED", 25.0, "US");
            saveOrUpdate("Zinc Oxide", "징크옥사이드", "1314-13-2", "ALLOWED", 25.0, "US");
        } catch (Exception e) {
            log.error("Failed to sync US regulations", e);
        }
    }

    private void updateChinaRegulations() {
        try {
            log.info(">>>> [CRAWLER] Syncing China (NMPA) Regulations...");
            saveOrUpdate("Phenoxyethanol", "페녹시에탄올", "122-99-6", "RESTRICTED", 1.0, "CN");
            saveOrUpdate("Lead", "납", null, "PROHIBITED", 0.0, "CN");
            saveOrUpdate("Salicylic Acid", "살리실릭애씨드", "69-72-7", "RESTRICTED", 0.5, "CN");
            saveOrUpdate("Kojic Acid", "코직애씨드", "501-30-4", "ALLOWED", 1.0, "CN");
            saveOrUpdate("Titanium Dioxide", "티타늄디옥사이드", "13463-67-7", "RESTRICTED", 25.0, "CN");
            saveOrUpdate("Zinc Oxide", "징크옥사이드", "1314-13-2", "RESTRICTED", 25.0, "CN");
            saveOrUpdate("Alpha-Arbutin", "알파-알부틴", "84380-01-8", "RESTRICTED", 2.0, "CN");
        } catch (Exception e) {
            log.error("Failed to sync China regulations", e);
        }
    }

    private void updateJapanRegulations() {
        try {
            log.info(">>>> [CRAWLER] Syncing Japan (PMDA) Regulations...");
            saveOrUpdate("Phenoxyethanol", "페녹시에탄올", "122-99-6", "RESTRICTED", 1.0, "JP");
            saveOrUpdate("Mercury", "수은", null, "PROHIBITED", 0.0, "JP");
            saveOrUpdate("Salicylic Acid", "살리실릭애씨드", "69-72-7", "RESTRICTED", 0.2, "JP");
            saveOrUpdate("Arbutin", "알부틴", "497-76-7", "ALLOWED", 7.0, "JP");
            saveOrUpdate("Alpha-Arbutin", "알파-알부틴", "84380-01-8", "ALLOWED", 2.0, "JP");
            saveOrUpdate("Titanium Dioxide", "티타늄디옥사이드", "13463-67-7", "RESTRICTED", null, "JP");
            saveOrUpdate("Zinc Oxide", "징크옥사이드", "1314-13-2", "RESTRICTED", null, "JP");
        } catch (Exception e) {
            log.error("Failed to sync Japan regulations", e);
        }
    }

    private void saveOrUpdateRemarks(String inciName, String koreanName, String cas, String remarks) {
        List<RegulatoryIngredient> existingList = repository.findByInciName(inciName);
        RegulatoryIngredient ingredient;
        if (existingList.isEmpty()) {
            ingredient = RegulatoryIngredient.builder()
                .inciName(inciName)
                .koreanName(koreanName)
                .sourceApi("MANUAL")
                .build();
        } else {
            ingredient = existingList.get(0);
        }

        if (koreanName != null) ingredient.setKoreanName(koreanName);
        if (cas != null && !cas.equals("null")) ingredient.setCasNumber(cas);
        
        // Append or update remarks
        if (remarks != null && !remarks.isEmpty()) {
            ingredient.setRemarks(remarks);
            
            // Basic Auto-Parser for Phase 2
            parseAndSaveDetails(ingredient, remarks);
        }

        repository.save(ingredient);
    }

    private void parseAndSaveDetails(RegulatoryIngredient ingredient, String remarks) {
        // Clear old auto-generated details
        ingredient.getLimitDetails().removeIf(d -> !d.isManual());
        if (remarks == null || remarks.isEmpty()) return;

        // Clean remarks for better matching
        String cleanRemarks = remarks.replaceAll("\\[한도상세\\]|\\[사용범위\\]", " ").trim();
        boolean matched = false;

        // 1. Pattern for: "씻어내는 제품류 1.0%" or "씻어내지 않는 제품류 0.5%"
        java.util.regex.Pattern p1 = java.util.regex.Pattern.compile("([가-힣a-zA-Z\\s]{2,20}?\\s*(?:제품|제품류|화장품)?)\\s*([0-9.]+)\\s*%");
        java.util.regex.Matcher m1 = p1.matcher(cleanRemarks);
        
        while (m1.find()) {
            String type = m1.group(1).trim();
            type = type.replaceAll("^(?:배합한도|사용|후|기타|즉시|수입|생산|에|은|는)\\s*", "").trim();
            if (type.length() < 2) continue;
            try {
                Double val = Double.parseDouble(m1.group(2));
                ingredient.getLimitDetails().add(IngredientLimitDetail.builder()
                        .ingredient(ingredient)
                        .country("KR")
                        .productType(type)
                        .limitPercent(val)
                        .conditionText(remarks)
                        .isManual(false)
                        .build());
                matched = true;
            } catch (Exception e) {}
        }

        // 2. Fallback / generic limit parsing: "1.0% (씻어내는 제품)" or similar
        if (!matched) {
            java.util.regex.Pattern p2 = java.util.regex.Pattern.compile("([0-9.]+)\\s*%");
            java.util.regex.Matcher m2 = p2.matcher(cleanRemarks);
            if (m2.find()) {
                try {
                    Double val = Double.parseDouble(m2.group(1));
                    String type = "일반 화장품";
                    if (cleanRemarks.contains("씻어내는")) {
                        type = "씻어내는 제품";
                    } else if (cleanRemarks.contains("씻어내지")) {
                        type = "씻어내지 않는 제품";
                    } else if (cleanRemarks.contains("입술")) {
                        type = "입술용 제품";
                    } else if (cleanRemarks.contains("눈")) {
                        type = "눈 화장용 제품";
                    }
                    ingredient.getLimitDetails().add(IngredientLimitDetail.builder()
                            .ingredient(ingredient)
                            .country("KR")
                            .productType(type)
                            .limitPercent(val)
                            .conditionText(remarks)
                            .isManual(false)
                            .build());
                } catch (Exception e) {}
            }
        }
    }

    private void saveOrUpdate(String inciName, String koreanName, String cas, String status, Double limit, String country) {
        List<RegulatoryIngredient> existingList = repository.findByInciName(inciName);
        RegulatoryIngredient ingredient;
        if (existingList.isEmpty()) {
            ingredient = RegulatoryIngredient.builder()
                .inciName(inciName)
                .koreanName(koreanName)
                .sourceApi("MANUAL")
                .build();
        } else {
            ingredient = existingList.get(0);
        }

        if (koreanName != null && !koreanName.isEmpty() && !"null".equalsIgnoreCase(koreanName)) {
            ingredient.setKoreanName(koreanName);
        }
        if (cas != null && !cas.isEmpty() && !"null".equalsIgnoreCase(cas)) {
            ingredient.setCasNumber(cas);
        }

        switch (country) {
            case "KR":
                if (status != null) ingredient.setKrStatus(status);
                if (limit != null) ingredient.setKrLimit(limit);
                break;
            case "EU":
                if (status != null) ingredient.setEuStatus(status);
                if (limit != null) ingredient.setEuLimit(limit);
                break;
            case "US":
                if (status != null) ingredient.setUsStatus(status);
                if (limit != null) ingredient.setUsLimit(limit);
                break;
            case "CN":
                if (status != null) ingredient.setCnStatus(status);
                if (limit != null) ingredient.setCnLimit(limit);
                break;
            case "JP":
                if (status != null) ingredient.setJpStatus(status);
                if (limit != null) ingredient.setJpLimit(limit);
                break;
        }

        // [FIX] 타국가 배합한도 데이터 주입 시에도 상세한도 목록(limitDetails)에 자동 매핑 적재
        if ("RESTRICTED".equals(status) && limit != null) {
            // 중복 방지: 이미 해당 국가의 동일 유형 상세정보가 있는지 체크 후 추가
            boolean exists = ingredient.getLimitDetails().stream()
                    .anyMatch(d -> country.equals(d.getCountry()) && "일반 화장품".equals(d.getProductType()));
            
            if (!exists) {
                ingredient.getLimitDetails().add(IngredientLimitDetail.builder()
                        .ingredient(ingredient)
                        .country(country)
                        .productType("일반 화장품")
                        .limitPercent(limit)
                        .conditionText(country + " 배합한도 규정 준수 필요")
                        .isManual(false)
                        .build());
            }
        }
        
        repository.save(ingredient);
    }
}
