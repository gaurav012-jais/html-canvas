import { initDatabase } from '../../src/database/index.js';

async function seedCampaign8() {
  const ds = await initDatabase();
  let existing = await ds.getRepository('Campaign').findOne({ where: { id: 8 } });
  if (!existing) {
    await ds.query(`
      INSERT INTO "campaigns" ("id", "name", "country", "operator", "operator_id", "service_id", "user_id", "active", "verification_mode", "flow_config", "created_at", "updated_at")
      VALUES (8, 'Saudi Zain E2E', 'Saudi Arabia', 'ZAIN', 9, 'e2e_zain', 1, true, 'BOTH', '{"version":1,"entryPage":"HOME","startConfig":{"runHe":true,"runBlocklist":true,"runChecksub":true},"nodes":[{"id":"HOME","pageType":"HOME"},{"id":"OTP","pageType":"OTP"},{"id":"CONFIRM","pageType":"CONFIRM"},{"id":"THANKYOU","pageType":"THANKYOU"}],"edges":[]}', NOW(), NOW())
      ON CONFLICT ("id") DO NOTHING;
    `);
    console.log('Inserted campaign 8');
  }

  const template = await ds.getRepository('Template').findOne({ where: {} });
  const templateId = template ? template.id : 1;

  for (const pageType of ['HOME', 'OTP', 'CONFIRM', 'THANKYOU']) {
    await ds.query(`
      INSERT INTO "campaign_pages" ("campaign_id", "page_type", "template_id", "created_at", "updated_at")
      VALUES (8, '${pageType}', ${templateId}, NOW(), NOW())
      ON CONFLICT ("campaign_id", "page_type") DO UPDATE SET "template_id" = ${templateId};
    `);
  }

  await ds.query(`
    INSERT INTO "api_configs" ("campaign_id", "subscription_api", "he_provider", "created_at", "updated_at")
    VALUES (8, 'https://example.com/mock-checksub?msisdn={{msisdn}}', 'header', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  `);

  console.log('Campaign 8 successfully configured with templateId:', templateId);
  await ds.destroy();
}

seedCampaign8().catch(err => {
  console.error('Failed to seed campaign 8:', err);
  process.exit(1);
});
