// SEZGIR: History sealed at rest — the cipher, the key, and the store that uses both.

import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HistoryEntry } from '../../src/contracts/index.js';
import {
  SEALED_PREFIX,
  createAesGcmLineCipher,
  loadOrCreateHistoryKey,
  type KeyProtector,
} from '../../src/platform/history-cipher.js';
import { createFileHistoryStore } from '../../src/platform/history.js';

/** DPAPI's shape, with a "machine" secret standing in for the Windows account. */
function protector(machine = 'this-account', available = true): KeyProtector {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (plain) => Buffer.from(`${machine}:${plain}`, 'utf8'),
    decryptString: (sealed) => {
      const text = sealed.toString('utf8');
      if (!text.startsWith(`${machine}:`)) throw new Error('DPAPI: wrong account');
      return text.slice(machine.length + 1);
    },
  };
}

function entry(id: string, result: string, startedAt = '2026-10-13T10:00:00.000Z'): HistoryEntry {
  return { id, startedAt, language: 'uz', engineID: 'e', raw: result, result, polished: null, audioSeconds: 1, audioPath: null };
}

let dir: string;
let historyPath: string;
let keyPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sezgir-history-'));
  historyPath = join(dir, 'history.jsonl');
  keyPath = join(dir, 'history.key');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the line cipher', () => {
  const key = Buffer.alloc(32, 7);

  it('round-trips, with a fresh IV every time', () => {
    const cipher = createAesGcmLineCipher(key);
    const a = cipher.seal('{"result":"Salom dunyo"}');
    const b = cipher.seal('{"result":"Salom dunyo"}');
    expect(a.startsWith(SEALED_PREFIX)).toBe(true);
    expect(a).not.toBe(b);
    expect(cipher.open(a)).toBe('{"result":"Salom dunyo"}');
    expect(a).not.toContain('Salom');
  });

  it('refuses a tampered line, a line under another key, and plain text', () => {
    const cipher = createAesGcmLineCipher(key);
    const sealed = cipher.seal('secret words');
    const bytes = Buffer.from(sealed.slice(SEALED_PREFIX.length), 'base64');
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1;
    expect(cipher.open(SEALED_PREFIX + bytes.toString('base64'))).toBeNull();
    expect(createAesGcmLineCipher(Buffer.alloc(32, 8)).open(sealed)).toBeNull();
    expect(cipher.open('{"id":"x"}')).toBeNull();
  });

  it('wants a 256-bit key', () => {
    expect(() => createAesGcmLineCipher(Buffer.alloc(16))).toThrow(/32 bytes/u);
  });
});

describe('the history key', () => {
  it('is made once, sealed by the protector, and read back the next time', async () => {
    const first = await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector() });
    const stored = readFileSync(keyPath, 'utf8');
    expect(Buffer.from(stored.trim(), 'base64').toString('utf8').startsWith('this-account:')).toBe(true);
    const second = await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector() });
    expect(readFileSync(keyPath, 'utf8')).toBe(stored);
    const line = first.cipher!.seal('x');
    expect(second.cipher!.open(line)).toBe('x');
  });

  it('with no protection on offer, keeps History plain and says so', async () => {
    const result = await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector('a', false) });
    expect(result.cipher).toBeNull();
    expect(result.notes.join(' ')).toMatch(/not encrypted/u);
  });

  it('a key another account sealed sets the old history aside — never deletes it — and starts anew', async () => {
    await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector('old-account') });
    writeFileSync(historyPath, 'enc1:somethingsealed\n');
    const result = await loadOrCreateHistoryKey({
      keyPath,
      historyPath,
      protector: protector('new-account'),
      now: () => new Date('2026-10-13T10:00:00Z'),
    });
    expect(result.cipher).not.toBeNull();
    const names = readdirSync(dir).sort();
    expect(names).toEqual([
      'history.jsonl.unreadable-2026-10-13T10-00-00-000Z',
      'history.key',
      'history.key.unreadable-2026-10-13T10-00-00-000Z',
    ]);
  });
});

describe('the history store, sealed', () => {
  it('writes no word of a dictation in the clear, and reads it all back', async () => {
    const { cipher } = await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector() });
    const store = createFileHistoryStore({ path: historyPath, cipher });
    await store.open();
    await store.insert(entry('1', 'Ertaga soat oʻnda bankka boraman'));
    await store.insert(entry('2', 'Parolim maxfiy', '2026-10-13T11:00:00.000Z'));
    const onDisk = readFileSync(historyPath, 'utf8');
    expect(onDisk).not.toMatch(/Ertaga|bankka|Parolim/u);
    expect(onDisk.trim().split('\n').every((line) => line.startsWith(SEALED_PREFIX))).toBe(true);

    const reopened = createFileHistoryStore({ path: historyPath, cipher });
    await reopened.open();
    expect((await reopened.recent()).map((e) => e.result)).toEqual(['Parolim maxfiy', 'Ertaga soat oʻnda bankka boraman']);
    expect((await reopened.search('bank')).map((e) => e.id)).toEqual(['1']);
  });

  it('seals a plain history it finds, on the first open', async () => {
    const plain = createFileHistoryStore({ path: historyPath });
    await plain.open();
    await plain.insert(entry('1', 'eski yozuv'));
    expect(readFileSync(historyPath, 'utf8')).toContain('eski yozuv');

    const { cipher } = await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector() });
    const sealed = createFileHistoryStore({ path: historyPath, cipher });
    await sealed.open();
    expect(readFileSync(historyPath, 'utf8')).not.toContain('eski yozuv');
    expect((await sealed.recent()).map((e) => e.result)).toEqual(['eski yozuv']);
    expect(sealed.notes.join(' ')).toMatch(/sealed 1 plain/u);
  });

  it('a launch without the key keeps the sealed lines through a delete, and clear-all drops them', async () => {
    const { cipher } = await loadOrCreateHistoryKey({ keyPath, historyPath, protector: protector() });
    const sealed = createFileHistoryStore({ path: historyPath, cipher });
    await sealed.open();
    await sealed.insert(entry('1', 'muhim gap'));

    const keyless = createFileHistoryStore({ path: historyPath });
    await keyless.open();
    expect(await keyless.recent()).toEqual([]);
    await keyless.insert(entry('2', 'yangi', '2026-10-13T12:00:00.000Z'));
    await keyless.delete('2');
    const lines = readFileSync(historyPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.startsWith(SEALED_PREFIX)).toBe(true);

    const back = createFileHistoryStore({ path: historyPath, cipher });
    await back.open();
    expect((await back.recent()).map((e) => e.result)).toEqual(['muhim gap']);

    await keyless.clearAll();
    expect(readFileSync(historyPath, 'utf8')).toBe('');
  });
});
