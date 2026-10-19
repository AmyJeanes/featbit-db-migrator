import test from 'node:test';
import assert from 'node:assert/strict';
import { UUID, Binary, Long } from 'mongodb';
import { ConverterBase } from '../converters/converterBase.js';
import { Converter } from '../converters/converter.js';
import { normalizeBson, validateSource } from '../source.js';

const base = new ConverterBase();
test('BSON UUIDs survive nested JSON and binary decoding', () => {
  const id = new UUID('acb588c1-cd8c-4a38-9cc0-71a969a4135a');
  assert.deepEqual(normalizeBson({ _id: id, nested: [new Binary(id.buffer, 4)], count: Long.fromString('9007199254740993') }), {
    _id: id.toString(), nested: [id.toString()], count: '9007199254740993'
  });
});
test('CSV distinguishes null and empty and escapes CR, LF, delimiters and quotes', () => {
  assert.equal(base.toStringValue(null), '');
  assert.equal(base.toStringValue(''), '""');
  assert.equal(base.toStringValue('a|"b\r\nc'), '"a|""b\r\nc"');
});
test('PostgreSQL arrays preserve null, empty, literal NULL and backslashes', () => {
  assert.equal(base.toStringArrayValue([]), '{}');
  assert.equal(base.toStringArrayValue(null), '{}');
  assert.equal(base.toStringArrayValue(undefined), '{}');
  assert.equal(base.toStringArrayValue(['', null, 'NULL', 'a\\b', 'a"b']), '"{"""",NULL,""NULL"",""a\\\\b"",""a\\""b""}"');
});
test('5.4.10 users and memberships preserve moved fields', () => {
  assert(!Converter.getConverter('Users').pgColumns.includes('workspace_id'));
  assert(Converter.getConverter('Users').pgColumns.includes('initial_password'));
  assert(!Converter.getConverter('OrganizationUsers').pgColumns.includes('initial_password'));
  assert(Converter.getConverter('WorkspaceUsers').pgColumns.includes('user_id'));
});
test('reject legacy source schemas instead of silently dropping fields', () => {
  assert.throws(() => validateSource('Users', { workspaceId: 'old' }), /upgrade/);
  assert.throws(() => validateSource('Policies', { name: 'no-key' }), /key/);
  assert.throws(() => validateSource('Environments', { settings: [] }), /object/);
  assert.doesNotThrow(() => validateSource('Environments', { settings: { feature: true } }));
});
