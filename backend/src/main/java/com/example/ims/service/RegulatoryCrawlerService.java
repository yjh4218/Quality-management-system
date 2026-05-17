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
        RestTemplate rt = new RestTemplate();
        rt.getMessageConverters().removeIf(converter -> converter instanceof StringHttpMessageConverter);
        rt.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));
        return rt;
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
        Optional<RegulatoryIngredient> existing = repository.findByInciName(inciName);
        RegulatoryIngredient ingredient = existing.orElseGet(() -> RegulatoryIngredient.builder()
                .inciName(inciName)
                .koreanName(koreanName)
                .build());
        
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

            while ((pageNo - 1) * numOfRows < totalCount) {
                // Manual URL construction to avoid library-specific encoding issues
                String urlString = String.format("%s?serviceKey=%s&type=json&pageNo=%d&numOfRows=%d", 
                        REGL_API_URL, SERVICE_KEY, pageNo, numOfRows);
                
                String response;
                try {
                    response = restTemplate.getForObject(urlString, String.class);
                } catch (Exception e) {
                    // Fallback to HTTP if HTTPS fails
                    log.warn(">>>> [CRAWLER] HTTPS failed, trying HTTP fallback...");
                    urlString = urlString.replace("https://", "http://");
                    response = restTemplate.getForObject(urlString, String.class);
                }

                JsonNode root = objectMapper.readTree(response);
                JsonNode body = root.path("body");
                
                totalCount = body.path("totalCount").asInt();
                JsonNode items = body.path("items");

                if (items.isArray() && items.size() > 0) {
                    for (JsonNode item : items) {
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
                            // [FIX] Atomic save: 한 번의 save()로 remarks + status + limitDetails를 모두 저장
                            saveKoreaRegulationAtomic(engName, korName, cas, detailedRemarks, prohNational, limitNational);
                        }
                    }
                } else {
                    // If items are missing or totalCount is reported but no items returned
                    log.warn(">>>> [CRAWLER] No items returned for page {}. Stopping.", pageNo);
                    break;
                }
                
                if (pageNo % 10 == 0) log.info(">>>> [CRAWLER] KR API Progress: {} / {} ({}%)", (pageNo * numOfRows), totalCount, Math.min(100, (pageNo * numOfRows * 100) / Math.max(1, totalCount)));
                pageNo++;
                
                if (pageNo > 300) break; // Limit to 30,000 items
            }
            
            log.info(">>>> [CRAWLER] KR API Sync Completed. Total records processed: {}", totalCount);
            
            // 2. Fetch full ingredient master (2.5k+)
            updateKoreaIngredientMaster();
            
        } catch (Exception e) {
            log.error("Failed to sync Korea regulations via API", e);
        }
    }

    /**
     * [FIX] 하나의 성분에 대해 remarks + 국가 규제 상태 + limitDetails를 단 한 번의 save()로 원자적 처리.
     * 이전에는 saveOrUpdateRemarks() → saveOrUpdate() × N 으로 여러 번 save()하면서
     * limitDetails가 소멸되는 문제가 있었음.
     */
    private void saveKoreaRegulationAtomic(String inciName, String koreanName, String cas, String remarks, String prohNational, String limitNational) {
        RegulatoryIngredient ingredient = repository.findByInciName(inciName)
                .orElse(RegulatoryIngredient.builder().inciName(inciName).build());

        if (koreanName != null) ingredient.setKoreanName(koreanName);
        if (cas != null && !cas.equals("null")) ingredient.setCasNumber(cas);

        // 1. Remarks + LimitDetails 설정 (기존 remarks가 이미 등록되어 있다면 보존하여 덮어쓰기 방지)
        if (ingredient.getRemarks() == null || ingredient.getRemarks().trim().isEmpty()) {
            if (remarks != null && !remarks.isEmpty()) {
                ingredient.setRemarks(remarks);
                parseAndSaveDetails(ingredient, remarks);
            }
        }

        // 2. 국가별 규제 상태 설정 (같은 엔티티 객체에서)
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

            while ((pageNo - 1) * numOfRows < totalCount) {
                String urlString = String.format("%s?serviceKey=%s&type=json&pageNo=%d&numOfRows=%d", 
                        INGD_API_URL, SERVICE_KEY, pageNo, numOfRows);
                
                String response;
                try {
                    response = restTemplate.getForObject(urlString, String.class);
                } catch (Exception e) {
                    log.warn(">>>> [CRAWLER] HTTPS failed for Master, trying HTTP fallback...");
                    urlString = urlString.replace("https://", "http://");
                    response = restTemplate.getForObject(urlString, String.class);
                }

                JsonNode root = objectMapper.readTree(response);
                JsonNode body = root.path("body");
                
                totalCount = body.path("totalCount").asInt();
                JsonNode items = body.path("items");

                if (items.isArray() && items.size() > 0) {
                    for (JsonNode item : items) {
                        String engName = item.path("INGR_ENG_NAME").asText();
                        String korName = item.path("INGR_KOR_NAME").asText();
                        String cas = item.path("CAS_NO").asText();
                        
                        // Some records only have a Korean name and no English INCI name.
                        // We use the Korean name as the unique identifier if INCI is missing.
                        if (engName == null || engName.isEmpty() || "null".equalsIgnoreCase(engName)) {
                            engName = korName;
                        }
                        
                        if (engName != null && !engName.isEmpty() && !"null".equalsIgnoreCase(engName)) {
                            saveIfNew(engName, korName, cas, "KR");
                        }
                    }
                } else {
                    log.warn(">>>> [CRAWLER] No items returned for Master page {}. Stopping.", pageNo);
                    break;
                }
                if (pageNo % 10 == 0) log.info(">>>> [CRAWLER] KR Master Progress: {} / {}", (pageNo * numOfRows), totalCount);
                pageNo++;
                
                if (pageNo > 300) break; 
            }
            log.info(">>>> [CRAWLER] KR Ingredient Master Sync Completed.");
        } catch (Exception e) {
            log.error("Failed to sync Korea ingredient master", e);
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
        RegulatoryIngredient ingredient = repository.findByInciName(inciName)
                .orElse(RegulatoryIngredient.builder().inciName(inciName).build());

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
        RegulatoryIngredient ingredient = repository.findByInciName(inciName)
                .orElse(RegulatoryIngredient.builder().inciName(inciName).build());

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
