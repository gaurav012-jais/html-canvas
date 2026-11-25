/**
 * Shared idempotent DDL helpers for TypeORM migrations.
 *
 * Pre-checking schema catalogs avoids catching Postgres errors mid-transaction
 * (which otherwise aborts the rest of the migration transaction with 25P02).
 */

export const isPostgresRunner = (queryRunner) =>
  queryRunner?.connection?.options?.type === 'postgres';

export const ensureColumn = async (queryRunner, table, column, ddl) => {
  if (!(await queryRunner.hasColumn(table, column))) {
    await queryRunner.query(ddl);
  }
};

export const ensureDropColumn = async (queryRunner, table, column) => {
  if (!(await queryRunner.hasColumn(table, column))) return;
  const pg = isPostgresRunner(queryRunner);
  const t = pg ? `"${table}"` : `\`${table}\``;
  const c = pg ? `"${column}"` : `\`${column}\``;
  await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN ${c}`);
};

export const hasIndex = async (queryRunner, table, indexName) => {
  if (isPostgresRunner(queryRunner)) {
    const rows = await queryRunner.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND tablename = $1 AND indexname = $2 LIMIT 1`,
      [table, indexName],
    );
    return rows.length > 0;
  }
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1`,
    [table, indexName],
  );
  return rows.length > 0;
};

export const ensureIndex = async (queryRunner, table, indexName, ddl) => {
  if (!(await hasIndex(queryRunner, table, indexName))) {
    await queryRunner.query(ddl);
  }
};

export const dropIndexIfExists = async (queryRunner, table, indexName) => {
  if (!(await hasIndex(queryRunner, table, indexName))) return;
  if (isPostgresRunner(queryRunner)) {
    await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}"`);
  } else {
    await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${table}\``);
  }
};

export const hasConstraint = async (queryRunner, table, constraintName) => {
  if (isPostgresRunner(queryRunner)) {
    const rows = await queryRunner.query(
      `SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       WHERE nsp.nspname = current_schema()
         AND rel.relname = $1
         AND c.conname = $2
       LIMIT 1`,
      [table, constraintName],
    );
    return rows.length > 0;
  }
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ? LIMIT 1`,
    [table, constraintName],
  );
  return rows.length > 0;
};

export const ensureConstraint = async (queryRunner, table, constraintName, ddl) => {
  if (!(await hasConstraint(queryRunner, table, constraintName))) {
    await queryRunner.query(ddl);
  }
};

export const isColumnNullable = async (queryRunner, table, column) => {
  if (isPostgresRunner(queryRunner)) {
    const rows = await queryRunner.query(
      `SELECT is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2 LIMIT 1`,
      [table, column],
    );
    return rows[0]?.is_nullable === 'YES';
  }
  const rows = await queryRunner.query(
    `SELECT IS_NULLABLE AS is_nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column],
  );
  return rows[0]?.is_nullable === 'YES';
};
