package com.example.ims.config;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Database Seeder Service.
 * Refactored to be manually invokable for data migration (H2 to Supabase).
 * Removed automatic execution and Profile restriction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder {

    private final UserRepository userRepository;
    private final WmsInboundRepository inboundRepository;
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final ClaimRepository claimRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Seeds sample data into the database.
     * Uses defensive checks to prevent duplicates.
     */
    @Transactional
    public void seed() {
        log.info(">>>> [DATA MIGRATION] Starting Sample Data Seeding...");

        // 1. Core Users (Admin already handled by SystemStartupRunner, but we verify others)
        seedUsers();

        // 2. Base Metadata
        seedMetadata();

        // 3. Products (Large scale)
        if (productRepository.count() < 10) {
            seedProducts();
        } else {
            log.info("Products already exist, skipping bulk product seeding.");
        }

        // 4. WMS Entries
        if (inboundRepository.count() < 50) {
            seedWmsInbound();
        } else {
            log.info("WMS records already exist, skipping WMS seeding.");
        }

        // 5. Claims
        if (claimRepository.count() < 100) {
            seedClaims();
            seed100Claims();
        } else {
            log.info("Claims already exist, skipping claim seeding.");
        }

        log.info(">>>> [DATA MIGRATION] Sample Data Seeding Completed Successfully.");
    }

    private void seedUsers() {
        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.save(User.builder().username("admin").password(passwordEncoder.encode("admin"))
                    .name("시스템 관리자").companyName("더파운더즈").department("관리팀")
                    .role("ROLE_ADMIN").enabled(true).build());
        } else {
            userRepository.findByUsername("admin").ifPresent(admin -> {
                admin.setName("시스템 관리자");
                admin.setCompanyName("더파운더즈");
                userRepository.save(admin);
            });
        }
        if (userRepository.findByUsername("qa").isEmpty()) {
            userRepository.save(User.builder().username("qa").password(passwordEncoder.encode("qa"))
                    .name("품질담당자").companyName("더파운더즈").department("품질팀")
                    .role("ROLE_QUALITY").enabled(true).build());
        }
        if (userRepository.findByUsername("md").isEmpty()) {
            userRepository.save(User.builder().username("md").password(passwordEncoder.encode("md"))
                    .name("영업담당자").companyName("더파운더즈").department("영업팀")
                    .role("ROLE_SALES").enabled(true).build());
        }
        if (userRepository.findByUsername("ko").isEmpty()) {
            userRepository.save(User.builder().username("ko").password(passwordEncoder.encode("ko"))
                    .name("제조사담당자").companyName("한국콜마").department("영업팀")
                    .role("ROLE_MANUFACTURER").enabled(true).build());
        }
        if (userRepository.findByUsername("qc").isEmpty()) {
            userRepository.save(User.builder().username("qc").password(passwordEncoder.encode("qc"))
                    .name("화장품책임판매관리자").companyName("더파운더즈").department("품질팀")
                    .role("ROLE_RESPONSIBLE_SALES").enabled(true).build());
        }
        if (userRepository.findByUsername("mc").isEmpty()) {
            userRepository.save(User.builder().username("mc").password(passwordEncoder.encode("mc"))
                    .name("제조사 품질 담당자").companyName("코스메카코리아").department("품질팀")
                    .role("ROLE_MANUFACTURER").enabled(true).build());
        }
    }

    private void seedMetadata() {
        brandRepository.findByName("화장품").orElseGet(() -> brandRepository.save(Brand.builder().name("화장품").build()));
        brandRepository.findByName("기타").orElseGet(() -> brandRepository.save(Brand.builder().name("기타").build()));

        manufacturerRepository.findByName("한국콜마").orElseGet(() -> manufacturerRepository.save(Manufacturer.builder()
                .name("한국콜마").category("화장품").identificationCode("M001").contactPerson("김제조").build()));
        manufacturerRepository.findByName("코스맥스").orElseGet(() -> manufacturerRepository.save(Manufacturer.builder()
                .name("코스맥스").category("화장품").identificationCode("M004").contactPerson("박맥스").build()));
        manufacturerRepository.findByName("코스메카코리아").orElseGet(() -> manufacturerRepository.save(Manufacturer.builder()
                .name("코스메카코리아").category("화장품").identificationCode("M005").contactPerson("최메카").build()));
    }

    private void seedProducts() {
        Brand brandCos = brandRepository.findByName("화장품").orElse(null);
        Manufacturer mKolmar = manufacturerRepository.findByName("한국콜마").orElse(null);

        String[] skinNames = {"촉촉 담금 토너", "어성초 진정 스킨", "히알루론산 토너", "시카 마일드 스킨", "비타민 글로우 토너"};
        String[] sunNames = {"수분 에센스 선", "무기자차 선크림", "톤업 선 베이스", "데일리 선 젤", "스포츠 선 스틱"};
        
        seedCosmeticGroup("스킨", "AA00001", skinNames, brandCos, mKolmar);
        seedCosmeticGroup("선", "AA00006", sunNames, brandCos, mKolmar);
        
        // Add more groups as needed for volume
        populateMissingData();
    }

    private void seedCosmeticGroup(String category, String startCode, String[] names, Brand brand, Manufacturer manufacturer) {
        int startNum = Integer.parseInt(startCode.substring(2));
        for (int i = 0; i < names.length; i++) {
            String code = String.format("AA%05d", startNum + i);
            if (productRepository.findByItemCode(code).isEmpty()) {
                productRepository.save(Product.builder()
                        .itemCode(code)
                        .productName(names[i])
                        .brand(brand)
                        .manufacturerInfo(manufacturer)
                        .isMaster(true)
                        .capacity("100mL")
                        .weight("150g")
                        .ingredients("정제수, 글리세린, 나이아신아마이드, " + category + " 추출물")
                        .build());
            }
        }
    }

    private void populateMissingData() {
        List<Product> products = productRepository.findAll();
        for (Product p : products) {
            if (p.getDimensions() == null) {
                Dimensions d = new Dimensions();
                d.setWidth(30.0);
                d.setLength(30.0);
                d.setHeight(120.0);
                d.setStatus("가안");
                p.setDimensions(d);
            }
            if (p.getInboxInfo() == null) p.setInboxInfo(new InboxInfo());
            if (p.getOutboxInfo() == null) p.setOutboxInfo(new OutboxInfo());
            if (p.getPalletInfo() == null) p.setPalletInfo(new PalletInfo());
            productRepository.save(p);
        }
    }

    private void seedWmsInbound() {
        List<Product> products = productRepository.findAll();
        if (products.isEmpty()) return;
        java.util.Random random = new java.util.Random();
        String[] manufacturers = {"한국콜마", "코스메카코리아", "코스맥스"};

        for (int i = 0; i < 50; i++) {
            Product p = products.get(random.nextInt(products.size()));
            String grnNum = "MIG-GRN-" + System.currentTimeMillis() + "-" + i;
            inboundRepository.save(WmsInbound.builder()
                    .grnNumber(grnNum)
                    .itemCode(p.getItemCode())
                    .productName(p.getProductName())
                    .quantity(100 + random.nextInt(900))
                    .manufacturer(manufacturers[random.nextInt(manufacturers.length)])
                    .inboundDate(java.time.LocalDateTime.now().minusDays(random.nextInt(30)))
                    .overallStatus(WmsInbound.OverallStatus.STEP5_FINAL_COMPLETE)
                    .inboundInspectionStatus("검사 완료")
                    .inboundInspectionResult("적합")
                    .build());
        }
    }

    private void seedClaims() {
        List<Product> products = productRepository.findAll();
        if (products.isEmpty()) return;
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 50; i++) {
            Product p = products.get(random.nextInt(products.size()));
            String clmNum = "MIG-CLM-" + System.currentTimeMillis() + "-" + i;
            claimRepository.save(Claim.builder()
                    .claimNumber(clmNum)
                    .itemCode(p.getItemCode())
                    .productName(p.getProductName())
                    .lotNumber("M-LOT" + (1000 + random.nextInt(9000)))
                    .manufacturer(p.getManufacturerInfo() != null ? p.getManufacturerInfo().getName() : "미상")
                    .receiptDate(java.time.LocalDate.now().minusDays(random.nextInt(60)))
                    .qualityStatus("4. 클레임 종결")
                    .claimContent("마이그레이션된 샘플 클레임 데이터입니다.")
                    .isDeleted(false)
                    .build());
        }
    }

    private void seed100Claims() {
        // Just calling seedClaims is enough for the "transfer" purpose.
    }
}
