export const cmsImportTables = [
  'cms_pages',
  'cms_news',
  'cms_news_translations',
  'cms_collections',
  'cms_collection_translations',
  'cms_media',
  'cms_inquiries',
  'cms_email_events'
];

export const cmsImportDeleteTables = [...cmsImportTables].reverse();

export function readCmsImportSnapshotFromText(value) {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`Unable to read CMS import JSON: ${error.message}`);
  }

  validateCmsImportSnapshot(parsed);
  return parsed;
}

export function validateCmsImportSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Invalid CMS import file: root value must be an object.');
  }

  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported CMS export schemaVersion: ${snapshot.schemaVersion}`);
  }

  if (!snapshot.tables || typeof snapshot.tables !== 'object' || Array.isArray(snapshot.tables)) {
    throw new Error('Invalid CMS import file: tables must be an object.');
  }

  const unexpectedTables = Object.keys(snapshot.tables).filter((table) => !cmsImportTables.includes(table));

  if (unexpectedTables.length > 0) {
    throw new Error(`Invalid CMS import file: unexpected tables ${unexpectedTables.join(', ')}`);
  }

  for (const table of cmsImportTables) {
    const rows = snapshot.tables[table];

    if (!Array.isArray(rows)) {
      throw new Error(`Invalid CMS import file: ${table} must be an array.`);
    }

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Invalid CMS import file: ${table}[${index}] must be an object.`);
      }

      for (const [column, value] of Object.entries(row)) {
        if (!isSqliteValue(value)) {
          throw new Error(`Invalid CMS import file: ${table}[${index}].${column} is not a scalar value.`);
        }
      }
    });
  }
}

export function getCmsImportCounts(snapshot) {
  validateCmsImportSnapshot(snapshot);

  return cmsImportTables.map((table) => ({
    table,
    count: snapshot.tables[table].length
  }));
}

export function importCmsSnapshot(db, snapshot) {
  validateCmsImportSnapshot(snapshot);
  const importTransaction = db.transaction(() => {
    for (const table of cmsImportDeleteTables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    for (const table of cmsImportTables) {
      const tableColumns = getTableColumns(db, table);

      for (const row of snapshot.tables[table]) {
        insertRow(db, table, tableColumns, row);
      }
    }
  });

  importTransaction();
}

function getTableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function insertRow(db, table, tableColumns, row) {
  const tableColumnSet = new Set(tableColumns);
  const unknownColumns = Object.keys(row).filter((column) => !tableColumnSet.has(column));

  if (unknownColumns.length > 0) {
    throw new Error(`Cannot import ${table}: unknown columns ${unknownColumns.join(', ')}`);
  }

  const columns = tableColumns.filter((column) => Object.hasOwn(row, column));

  if (columns.length === 0) {
    return;
  }

  db.prepare(
    `INSERT INTO ${table} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${columns
      .map((column) => `@${column}`)
      .join(', ')})`
  ).run(row);
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isSqliteValue(value) {
  return value === null || ['string', 'number'].includes(typeof value);
}
