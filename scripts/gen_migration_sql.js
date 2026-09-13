import { pageGuides } from '../frontend/src/guides/pageGuides.js';
import fs from 'fs';

let sql = '-- V104__seed_system_page_guides.sql\n-- Seed comprehensive user guides for all 39 QMS screens (ANSI SQL H2 / PostgreSQL compatible)\n\n';

for (const [pageKey, data] of Object.entries(pageGuides)) {
    const title = data.title.replace(/'/g, "''");
    const sectionsJson = JSON.stringify(data.sections).replace(/'/g, "''");
    const content = data.sections.map(s => s.subtitle + ': ' + s.content).join('\n\n').replace(/'/g, "''");
    
    sql += `INSERT INTO system_page_guides (page_key, title, sections_json, content, updated_by, created_at, updated_at)\n`;
    sql += `SELECT '${pageKey}', '${title}', '${sectionsJson}', '${content}', 'SYSTEM_INIT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\n`;
    sql += `WHERE NOT EXISTS (SELECT 1 FROM system_page_guides WHERE page_key = '${pageKey}');\n\n`;
}

fs.writeFileSync('./backend/src/main/resources/db/migration/V104__seed_system_page_guides.sql', sql, 'utf8');
console.log(`Successfully generated V104__seed_system_page_guides.sql with ${Object.keys(pageGuides).length} page guides! ✅`);
