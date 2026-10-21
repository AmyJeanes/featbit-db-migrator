import test from 'node:test';
import assert from 'node:assert/strict';
import { UUID, Binary, Long } from 'mongodb';
import { ConverterBase } from '../src/converters/converterBase.js';
import { normalizeBson } from '../src/mongodb-document.js';

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
