// SEZGIR: History, encrypted at rest.
//
// History is the one file that holds what the user SAID — every dictation, word for word —
// and it sits in %LOCALAPPDATA%, where any program running as the user, a backup tool or a
// copied profile can read it. So every line is sealed with AES-256-GCM, and the key is
// itself sealed by the operating system: on Windows Electron's `safeStorage` is DPAPI, which
// ties it to this Windows account on this machine. A history file copied anywhere else is
// noise, and a line edited on disk fails its tag and is skipped rather than shown.
//
// May use Node. May NOT import `electron`: the key protector is handed in by `src/main`.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';

import { writeFileAtomic } from './settings.js';

/** Seals and opens one history line. `open` answers `null` for anything it cannot vouch for. */
export interface LineCipher {
  seal(plain: string): string;
  open(sealed: string): string | null;
}

/** Every sealed line starts with this, so a sealed line is never mistaken for JSON. */
export const SEALED_PREFIX = 'enc1:';

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function isSealedLine(line: string): boolean {
  return line.startsWith(SEALED_PREFIX);
}

/** AES-256-GCM, a fresh random IV per line: `enc1:` + base64(iv ‖ tag ‖ ciphertext). */
export function createAesGcmLineCipher(key: Uint8Array): LineCipher {
  if (key.length !== KEY_BYTES) throw new Error(`a history key is ${String(KEY_BYTES)} bytes, not ${String(key.length)}`);
  const secret = Buffer.from(key);
  return {
    seal(plain: string): string {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', secret, iv);
      const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return SEALED_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
    },
    open(sealed: string): string | null {
      if (!isSealedLine(sealed)) return null;
      try {
        const bytes = Buffer.from(sealed.slice(SEALED_PREFIX.length), 'base64');
        if (bytes.length < IV_BYTES + TAG_BYTES) return null;
        const decipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0, IV_BYTES));
        decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
        return Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
      } catch {
        return null;
      }
    },
  };
}

/** What `src/main` hands in: Electron's `safeStorage` (DPAPI on Windows), by shape. */
export interface KeyProtector {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(sealed: Buffer): string;
}

export interface HistoryKeyResult {
  /** `null` when the operating system offers no protection: History is then kept as before. */
  readonly cipher: LineCipher | null;
  /** What happened, for the diagnostics log. Never the key. */
  readonly notes: readonly string[];
}

/**
 * The history key: read and unsealed when there is one, made and sealed when there is not.
 *
 * A key that will not unseal (the profile was copied to another machine, the Windows
 * password was reset by an administrator) cannot be recovered by anyone, so the history it
 * protected is set aside under a dated name — never deleted, never shown — and a new key
 * starts an empty one.
 */
export async function loadOrCreateHistoryKey(options: {
  readonly keyPath: string;
  readonly historyPath: string;
  readonly protector: KeyProtector;
  readonly now?: () => Date;
}): Promise<HistoryKeyResult> {
  const notes: string[] = [];
  const { keyPath, historyPath, protector } = options;
  if (!protector.isEncryptionAvailable()) {
    notes.push('history: the operating system offers no key protection; history is not encrypted');
    return { cipher: null, notes };
  }

  let stored: string | null = null;
  try {
    stored = (await fs.readFile(keyPath, 'utf8')).trim();
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') throw error;
  }

  if (stored !== null && stored !== '') {
    try {
      const key = Buffer.from(protector.decryptString(Buffer.from(stored, 'base64')), 'base64');
      if (key.length === KEY_BYTES) return { cipher: createAesGcmLineCipher(key), notes };
      notes.push('history: the stored key has the wrong length');
    } catch {
      notes.push('history: the stored key could not be unsealed by this Windows account');
    }
    const stamp = (options.now?.() ?? new Date()).toISOString().replace(/[:.]/gu, '-');
    await fs.rename(historyPath, `${historyPath}.unreadable-${stamp}`).catch(() => undefined);
    await fs.rename(keyPath, `${keyPath}.unreadable-${stamp}`).catch(() => undefined);
    notes.push('history: the old history was set aside and a new one started');
  }

  const key = randomBytes(KEY_BYTES);
  const sealed = protector.encryptString(key.toString('base64'));
  await writeFileAtomic(keyPath, `${sealed.toString('base64')}\n`);
  notes.push('history: a new key was made and sealed by Windows');
  return { cipher: createAesGcmLineCipher(key), notes };
}

/** The key file's name, beside `history.jsonl` in %LOCALAPPDATA%\Sezgir. */
export const HISTORY_KEY_FILE_NAME = 'history.key';
