// Windows path building.
//
// D-W10 names this as one of exactly TWO places a port differs silently. Every
// developer here is on a Mac, so `node:path` would build POSIX paths in every test and
// backslashed ones only in production — which is why these are built by hand and
// asserted as literal Windows strings.

import { describe, expect, it } from 'vitest';

import {
  MissingWindowsPathError,
  joinWindowsPath,
  sezgirPaths,
  localAppDataDirectory,
  roamingAppDataDirectory,
} from '../../src/core/settings/index.js';

const ORDINARY = {
  APPDATA: 'C:\\Users\\aziz\\AppData\\Roaming',
  LOCALAPPDATA: 'C:\\Users\\aziz\\AppData\\Local',
  USERPROFILE: 'C:\\Users\\aziz',
};

describe('joinWindowsPath', () => {
  it('joins with backslashes and not slashes', () => {
    expect(joinWindowsPath('C:\\Users\\aziz', 'Sezgir', 'models')).toBe(
      'C:\\Users\\aziz\\Sezgir\\models',
    );
  });

  it('does not double a separator that is already there', () => {
    expect(joinWindowsPath('C:\\Users\\aziz\\', '\\Sezgir\\')).toBe('C:\\Users\\aziz\\Sezgir');
  });

  it('keeps a drive root a root', () => {
    // `C:\` trimmed to `C:` resolves against the CURRENT directory on that drive, not
    // its root — a bug that only appears when someone has cd'd elsewhere on C:.
    expect(joinWindowsPath('C:\\', 'Sezgir')).toBe('C:\\Sezgir');
  });

  it('keeps a UNC path a UNC path', () => {
    // A roaming profile on a domain share is a real deployment, and stripping the
    // leading backslashes silently retargets it at the local drive root.
    expect(joinWindowsPath('\\\\fileserver\\profiles\\aziz', 'Sezgir')).toBe(
      '\\\\fileserver\\profiles\\aziz\\Sezgir',
    );
  });

  it('skips empty segments instead of emitting empty components', () => {
    expect(joinWindowsPath('C:\\Sezgir', '', 'models')).toBe('C:\\Sezgir\\models');
  });

  // A space in a username is ordinary, not an edge case, and nothing here may quote it:
  // a path that arrives at `fs` pre-quoted fails to open in a way that reads like a
  // permissions problem. Quoting is a shell concern and nothing here sees a shell.
  it('leaves spaces in a path exactly as they are', () => {
    expect(joinWindowsPath('C:\\Users\\Aziz Nizomov\\AppData\\Roaming', 'Sezgir')).toBe(
      'C:\\Users\\Aziz Nizomov\\AppData\\Roaming\\Sezgir',
    );
  });
});

describe('the roaming and local directories', () => {
  it('uses APPDATA and LOCALAPPDATA when they are set', () => {
    expect(roamingAppDataDirectory(ORDINARY)).toBe('C:\\Users\\aziz\\AppData\\Roaming');
    expect(localAppDataDirectory(ORDINARY)).toBe('C:\\Users\\aziz\\AppData\\Local');
  });

  // A process launched from a service, a scheduled task or an SSH session routinely has
  // no APPDATA — and D-W10's Windows CI job is exactly such a process. Failing there
  // gives `undefined\Sezgir\settings.v1.json` on the one machine nobody can debug.
  it('falls back to USERPROFILE when APPDATA is unset', () => {
    expect(roamingAppDataDirectory({ USERPROFILE: 'C:\\Users\\aziz' })).toBe(
      'C:\\Users\\aziz\\AppData\\Roaming',
    );
    expect(localAppDataDirectory({ USERPROFILE: 'C:\\Users\\aziz' })).toBe(
      'C:\\Users\\aziz\\AppData\\Local',
    );
  });

  it('treats an empty APPDATA the same as an unset one', () => {
    expect(roamingAppDataDirectory({ APPDATA: '   ', USERPROFILE: 'C:\\Users\\aziz' })).toBe(
      'C:\\Users\\aziz\\AppData\\Roaming',
    );
  });

  it('falls back to HOMEDRIVE + HOMEPATH when USERPROFILE is unset too', () => {
    expect(roamingAppDataDirectory({ HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\aziz' })).toBe(
      'C:\\Users\\aziz\\AppData\\Roaming',
    );
  });

  it('names the variable it could not resolve rather than building a nonsense path', () => {
    expect(() => roamingAppDataDirectory({})).toThrow(MissingWindowsPathError);
    expect(() => roamingAppDataDirectory({})).toThrow(/APPDATA/);
    expect(() => localAppDataDirectory({})).toThrow(/LOCALAPPDATA/);
  });
});

describe('sezgirPaths', () => {
  it('puts settings and models in roaming, history and diagnostics in local', () => {
    const paths = sezgirPaths(ORDINARY);
    expect(paths).toEqual({
      roamingDirectory: 'C:\\Users\\aziz\\AppData\\Roaming\\Sezgir',
      localDirectory: 'C:\\Users\\aziz\\AppData\\Local\\Sezgir',
      settingsFile: 'C:\\Users\\aziz\\AppData\\Roaming\\Sezgir\\settings.v1.json',
      settingsUnreadableFile:
        'C:\\Users\\aziz\\AppData\\Roaming\\Sezgir\\settings.v1.json.unreadable',
      modelsDirectory: 'C:\\Users\\aziz\\AppData\\Roaming\\Sezgir\\models',
      historyFile: 'C:\\Users\\aziz\\AppData\\Local\\Sezgir\\history.jsonl',
      diagnosticsFile: 'C:\\Users\\aziz\\AppData\\Local\\Sezgir\\diagnostics.jsonl',
    });
  });

  it('survives a username with a space in it, unquoted', () => {
    const paths = sezgirPaths({
      APPDATA: 'C:\\Users\\Aziz Nizomov\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\Users\\Aziz Nizomov\\AppData\\Local',
    });
    expect(paths.settingsFile).toBe(
      'C:\\Users\\Aziz Nizomov\\AppData\\Roaming\\Sezgir\\settings.v1.json',
    );
    expect(paths.historyFile).toBe(
      'C:\\Users\\Aziz Nizomov\\AppData\\Local\\Sezgir\\history.jsonl',
    );
    expect(paths.settingsFile).not.toContain('"');
  });

  it('survives a non-ASCII username', () => {
    // The audience is Uzbek. `Ozodbek` is fine; `Озодбек` is what a Cyrillic-locale
    // install actually produces, and it must not be escaped or transliterated.
    const paths = sezgirPaths({
      APPDATA: 'C:\\Users\\Озодбек\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\Users\\Озодбек\\AppData\\Local',
    });
    expect(paths.roamingDirectory).toBe('C:\\Users\\Озодбек\\AppData\\Roaming\\Sezgir');
  });

  it('builds every path from the fallback when neither APPDATA nor LOCALAPPDATA is set', () => {
    const paths = sezgirPaths({ USERPROFILE: 'C:\\Users\\aziz' });
    expect(paths.settingsFile).toBe(
      'C:\\Users\\aziz\\AppData\\Roaming\\Sezgir\\settings.v1.json',
    );
    expect(paths.diagnosticsFile).toBe(
      'C:\\Users\\aziz\\AppData\\Local\\Sezgir\\diagnostics.jsonl',
    );
  });

  it('never emits a forward slash', () => {
    for (const value of Object.values(sezgirPaths(ORDINARY))) {
      expect(value).not.toContain('/');
    }
  });
});
