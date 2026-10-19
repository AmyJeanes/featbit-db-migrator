import test from 'node:test';
import assert from 'node:assert/strict';
import { withoutSeedData } from '../scripts/init-pg.js';

test('exclude the seed section while retaining all base DDL', () => {
  const ddl = 'create database featbit;\n\\connect featbit\nCREATE TABLE users (id uuid);\n';
  assert.equal(withoutSeedData(ddl + '-- 2. seed data\nINSERT INTO users VALUES (gen_random_uuid());\n'), ddl);
  assert.equal(withoutSeedData(ddl + '-- 2. seed data\r\nDO $$ dangerous seeds $$;'), ddl);
});
test('missing, ambiguous or changed seed boundaries fail closed', () => {
  for (const text of ['CREATE TABLE users (id uuid);', '-- 2. seed data\n-- 2. seed data\n', '-- 2. seed data changed\nINSERT INTO users VALUES (1);']) {
    assert.throws(() => withoutSeedData(text), /exactly one/);
  }
});
