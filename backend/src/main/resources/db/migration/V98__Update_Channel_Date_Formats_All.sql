-- V98: Update inbox, outbox, and pallet label date formats for all sales channels (excluding JP-OFF) and sync to packaging_specifications

-- 1. Domestic Channels (GENERAL, OY, PX, OY-US, HALAL)
UPDATE sales_channels
SET inbox_date_format = '제조일자 (Mfg. Date): YYYY.MM.DD' || CHR(10) || '사용기한 (Exp. Date): YYYY.MM.DD까지',
    outbox_date_format = '제조일자 (Mfg. Date): YYYY.MM.DD' || CHR(10) || '사용기한 (Exp. Date): YYYY.MM.DD까지',
    pallet_date_format = '제조일자 (Mfg. Date): YYYY.MM.DD' || CHR(10) || '사용기한 (Exp. Date): YYYY.MM.DD까지',
    exp_date_format = 'YYYY.MM.DD까지'
WHERE (channel_code IN ('GENERAL', 'OY', 'PX', 'OY-US', 'HALAL')
   OR name LIKE '%일반%' OR name LIKE '%올리브영%' OR name LIKE '%군마트%' OR name LIKE '%할랄%')
   AND (channel_code != 'JP-OFF' AND name NOT LIKE '%오프라인%');

-- 2. US, AMZ & Global Channels (JP-ON, JP-AMZ, GLB, US-AMZ, OTC)
UPDATE sales_channels
SET inbox_date_format = '제조일자 (Mfg. Date): MM-DD-YYYY' || CHR(10) || '사용기한 (Exp. Date): MM-DD-YYYY까지',
    outbox_date_format = '제조일자 (Mfg. Date): MM-DD-YYYY' || CHR(10) || '사용기한 (Exp. Date): MM-DD-YYYY까지',
    pallet_date_format = '제조일자 (Mfg. Date): MM-DD-YYYY' || CHR(10) || '사용기한 (Exp. Date): MM-DD-YYYY까지',
    exp_date_format = 'MM-DD-YYYY까지'
WHERE (channel_code IN ('JP-ON', 'JP-AMZ', 'GLB', 'US-AMZ', 'OTC')
   OR name LIKE '%온라인%' OR name LIKE '%글로벌%' OR name LIKE '%미국%' OR name LIKE '%OTC%')
   AND (channel_code != 'JP-OFF' AND name NOT LIKE '%오프라인%');

-- 3. Europe Channels (EU, EU-AMZ)
UPDATE sales_channels
SET inbox_date_format = '제조일자 (Mfg. Date): DD.MM.YYYY' || CHR(10) || '사용기한 (Exp. Date): DD.MM.YYYY까지',
    outbox_date_format = '제조일자 (Mfg. Date): DD.MM.YYYY' || CHR(10) || '사용기한 (Exp. Date): DD.MM.YYYY까지',
    pallet_date_format = '제조일자 (Mfg. Date): DD.MM.YYYY' || CHR(10) || '사용기한 (Exp. Date): DD.MM.YYYY까지',
    exp_date_format = 'DD.MM.YYYY까지'
WHERE (channel_code IN ('EU', 'EU-AMZ')
   OR name LIKE '%유럽%')
   AND (channel_code != 'JP-OFF' AND name NOT LIKE '%오프라인%');

-- 4. Sync to existing packaging_specifications based on product's sales_channel
UPDATE packaging_specifications
SET inbox_date_format = (
    SELECT sc.inbox_date_format FROM product_sales_channels psc
    JOIN sales_channels sc ON psc.channel_id = sc.id
    WHERE psc.product_id = packaging_specifications.product_id LIMIT 1
),
outbox_date_format = (
    SELECT sc.outbox_date_format FROM product_sales_channels psc
    JOIN sales_channels sc ON psc.channel_id = sc.id
    WHERE psc.product_id = packaging_specifications.product_id LIMIT 1
),
pallet_date_format = (
    SELECT sc.pallet_date_format FROM product_sales_channels psc
    JOIN sales_channels sc ON psc.channel_id = sc.id
    WHERE psc.product_id = packaging_specifications.product_id LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM product_sales_channels psc
    JOIN sales_channels sc ON psc.channel_id = sc.id
    WHERE psc.product_id = packaging_specifications.product_id
    AND sc.channel_code != 'JP-OFF' AND sc.name NOT LIKE '%오프라인%'
);
