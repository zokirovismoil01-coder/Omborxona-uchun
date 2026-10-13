import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    // Nine modules land here one at a time. A worktree in which only some of them
    // are implemented must still produce a green gate, so an empty run is not a
    // failure — the golden-parity suite is what asserts coverage, not the file count.
    passWithNoTests: true,
    reporters: ['default'],
    // SEZGIR: the Windows CI runner is a shared two-core box with real disks and Defender
    // scanning every temp file, and a test that fsyncs and renames 180 times or forks a
    // process takes 2–5x as long there as on Linux. 5 s (vitest's default) failed sound
    // tests on Windows by the clock alone; 30 s there still catches a genuine hang, and
    // Linux keeps the default, so a slow test is still noticed where it is cheap to run.
    testTimeout: process.platform === 'win32' ? 30_000 : 5_000,
  },
});
