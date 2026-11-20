import { DataSource } from 'typeorm';
import pg from 'pg';
import getConfig from '../config/configuration.js';
import { entities } from './entities/index.js';
import { migrations } from './migrations/index.js';

// Force PostgreSQL timestamp without time zone (OID 1114) parser to return UTC Date.
// By default, node-postgres parses timestamps in the local OS timezone (e.g. Africa/Nairobi, UTC+3),
// which distorts the timestamp by the server's UTC offset when converted to ISO strings.
if (pg?.types?.setTypeParser) {
  pg.types.setTypeParser(1114, (stringValue) => {
    if (!stringValue) return null;
    const normalized = stringValue.includes('T')
      ? stringValue
      : stringValue.replace(' ', 'T');
    const iso =
      normalized.endsWith('Z') || /[+-]\d{2}(?::?\d{2})?$/.test(normalized)
        ? normalized
        : `${normalized}Z`;
    return new Date(iso);
  });
}

/** @type {DataSource | null} */
let dataSource = null;

export { entities, migrations };

/**
 * Initializes the database connection and runs pending migrations.
 * Idempotent: returns existing DataSource if already initialized.
 * Supports both PostgreSQL and MySQL dialects.
 *
 * @returns {Promise<DataSource>} The initialized DataSource instance
 */
export const initDatabase = async () => {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  const config = getConfig();
  const dbConfig = config.database;
  const isPostgres = (dbConfig.type || 'postgres') === 'postgres';

  dataSource = new DataSource({
    type: dbConfig.type || 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    synchronize: false,
    logging: false,
    entities,
    migrations,
    extra: isPostgres
      ? { max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 15000 }
      : { connectionLimit: 20, waitForConnections: true },
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};

/**
 * Returns the active DataSource instance.
 * Throws an error if the database has not been initialized yet.
 *
 * @returns {DataSource}
 */
export const getDataSource = () => {
  if (!dataSource?.isInitialized) {
    throw new Error('Database DataSource has not been initialized yet.');
  }
  return dataSource;
};

/**
 * Gets a repository for the given entity schema.
 *
 * @param {any} entity
 * @returns {import('typeorm').Repository<any>}
 */
export const getRepository = (entity) => {
  return getDataSource().getRepository(entity);
};
