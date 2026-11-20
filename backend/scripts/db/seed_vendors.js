import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Client } = pg;

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'templatecraft',
  });
  await client.connect();

  try {
    const userId = 1;

    // Insert Vendors
    const v1 = await client.query(
      `
      INSERT INTO vendors (name, code, user_id, active) 
      VALUES ('AdMobi', 'ADM01', $1, true) 
      ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name 
      RETURNING id
    `,
      [userId],
    );
    const vendor1Id = v1.rows[0].id;

    const v2 = await client.query(
      `
      INSERT INTO vendors (name, code, user_id, active) 
      VALUES ('Mobite', 'MB02', $1, true) 
      ON CONFLICT (user_id, code) DO UPDATE SET name = EXCLUDED.name 
      RETURNING id
    `,
      [userId],
    );
    const vendor2Id = v2.rows[0].id;

    console.log('Vendors inserted:', vendor1Id, vendor2Id);

    // Insert Affiliates for Vendor 1
    await client.query(
      `
      INSERT INTO affiliates (vendor_id, name, code, user_id, active) 
      VALUES ($1, 'Affiliate Alpha', 'AFF_AL', $2, true) 
      ON CONFLICT (user_id, code) DO NOTHING
    `,
      [vendor1Id, userId],
    );
    await client.query(
      `
      INSERT INTO affiliates (vendor_id, name, code, user_id, active) 
      VALUES ($1, 'Affiliate Beta', 'AFF_BE', $2, true) 
      ON CONFLICT (user_id, code) DO NOTHING
    `,
      [vendor1Id, userId],
    );

    // Insert Affiliates for Vendor 2
    await client.query(
      `
      INSERT INTO affiliates (vendor_id, name, code, user_id, active) 
      VALUES ($1, 'Affiliate Gamma', 'AFF_GA', $2, true) 
      ON CONFLICT (user_id, code) DO NOTHING
    `,
      [vendor2Id, userId],
    );

    console.log('Affiliates inserted');

    // Assign vendors to campaigns via campaign_trackings
    const camp1 = await client.query(
      `SELECT id FROM campaigns WHERE name = 'AE Etisalat Games' LIMIT 1`,
    );
    if (camp1.rows.length) {
      const existing = await client.query(
        `SELECT id FROM campaign_trackings WHERE campaign_id = $1 AND vendor_id = $2`,
        [camp1.rows[0].id, vendor1Id],
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO campaign_trackings (campaign_id, vendor_id, active) VALUES ($1, $2, true)`,
          [camp1.rows[0].id, vendor1Id],
        );
      }
    }

    const camp2 = await client.query(
      `SELECT id FROM campaigns WHERE name = 'SA STC Videos' LIMIT 1`,
    );
    if (camp2.rows.length) {
      const existing = await client.query(
        `SELECT id FROM campaign_trackings WHERE campaign_id = $1 AND vendor_id = $2`,
        [camp2.rows[0].id, vendor2Id],
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO campaign_trackings (campaign_id, vendor_id, active) VALUES ($1, $2, true)`,
          [camp2.rows[0].id, vendor2Id],
        );
      }
    }

    console.log('Assigned vendors to campaigns successfully');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
