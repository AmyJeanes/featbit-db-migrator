import { fileHash } from '../src/integrity.js';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABLE_MAPPING } from '../src/tables.js';
import { Converter } from '../src/converters/converter.js';

export async function generateScripts(directory) {
  const dir = resolve(directory);
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  if (manifest.version !== '5.4.10' || manifest.tables.length !== TABLE_MAPPING.length) throw new Error('Invalid or incomplete export manifest');
  const lines = ['\\set ON_ERROR_STOP on', 'BEGIN;', 'SET LOCAL search_path TO public;'];
  // Lock all public tables and recheck emptiness within the import transaction.
  lines.push(`DO $$ DECLARE t record; populated boolean; BEGIN
FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
EXECUTE format('LOCK TABLE %I IN ACCESS EXCLUSIVE MODE', t.tablename);
EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I)', t.tablename) INTO populated;
IF populated THEN RAISE EXCEPTION 'Target table % is not empty', t.tablename; END IF;
END LOOP; END $$;`);
  for (const [i, mapping] of TABLE_MAPPING.entries()) {
    const [collection, table] = Object.entries(mapping)[0];
    const columns = Converter.getConverter(collection).pgColumns;
    const entry = manifest.tables[i];
    if (entry.table !== table || entry.file !== `${i}_${table}.csv` || JSON.stringify(entry.columns) !== JSON.stringify(columns) || !Number.isSafeInteger(entry.rows) || entry.rows < 0) throw new Error('Invalid manifest table');
    const path = join(dir, entry.file).split(sep).join('/');
    if (/[\r\n'\\]/.test(path)) throw new Error('Export path cannot contain quotes, backslashes or newlines');
    await access(path);
    if (await fileHash(path) !== entry.sha256) throw new Error(`CSV checksum mismatch: ${table}`);
    lines.push(`\\copy ${table} (${columns.join(', ')}) FROM '${path}' WITH (FORMAT csv, DELIMITER '|', ENCODING 'UTF8');`);
    lines.push(`DO $$ BEGIN IF (SELECT count(*) FROM ${table}) <> ${entry.rows} THEN RAISE EXCEPTION 'Row count mismatch: ${table}'; END IF; END $$;`);
  }
  lines.push(`DO $$ BEGIN
IF EXISTS (SELECT 1 FROM workspace_users w LEFT JOIN users u ON u.id=w.user_id LEFT JOIN workspaces s ON s.id=w.workspace_id WHERE u.id IS NULL OR s.id IS NULL) THEN RAISE EXCEPTION 'Orphan workspace membership'; END IF;
IF EXISTS (SELECT 1 FROM users u WHERE NOT EXISTS (SELECT 1 FROM workspace_users w WHERE w.user_id=u.id)) THEN RAISE EXCEPTION 'User has no workspace membership'; END IF;
IF EXISTS (SELECT 1 FROM organizations o LEFT JOIN workspaces w ON w.id=o.workspace_id WHERE w.id IS NULL) THEN RAISE EXCEPTION 'Orphan organization'; END IF;
IF EXISTS (SELECT 1 FROM organization_users o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN organizations g ON g.id=o.organization_id WHERE u.id IS NULL OR g.id IS NULL) THEN RAISE EXCEPTION 'Orphan organization membership'; END IF;
IF EXISTS (SELECT 1 FROM projects p LEFT JOIN organizations o ON o.id=p.organization_id WHERE o.id IS NULL) THEN RAISE EXCEPTION 'Orphan project'; END IF;
IF EXISTS (SELECT 1 FROM environments e LEFT JOIN projects p ON p.id=e.project_id WHERE p.id IS NULL) THEN RAISE EXCEPTION 'Orphan environment'; END IF;
END $$;`);
  lines.push('COMMIT;', '');
  const output = join(dir, 'scripts-to-run.sql');
  await writeFile(output, lines.join('\n'));
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/generate-import-script.js <export-directory>');
  console.log(await generateScripts(process.argv[2]));
}
