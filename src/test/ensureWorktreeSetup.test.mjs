import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const bootstrapScript = resolve('scripts/ensure-worktree-setup.mjs');
const tempDirectories = [];

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

function makeLinkedWorktree() {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'springa-native-worktree-'));
  tempDirectories.push(tempDirectory);

  const primary = join(tempDirectory, 'primary');
  const worktree = join(tempDirectory, 'worktree');
  mkdirSync(primary);
  git(primary, 'init', '-q', '-b', 'main');
  git(primary, 'config', 'user.email', 'test@example.com');
  git(primary, 'config', 'user.name', 'Test');
  git(primary, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(primary, 'tracked.txt'), 'fixture\n');
  git(primary, 'add', 'tracked.txt');
  git(primary, 'commit', '-q', '-m', 'fixture');
  git(primary, 'worktree', 'add', '-q', '-b', 'test-worktree', worktree);

  mkdirSync(join(worktree, 'node_modules', 'expo'), { recursive: true });
  writeFileSync(join(worktree, 'node_modules', 'expo', 'package.json'), '{}\n');

  return { primary, worktree };
}

function runBootstrap(worktree, env = process.env, mode = 'development') {
  const bin = join(worktree, 'test-bin');
  const npm = join(bin, 'npm');
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    npm,
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$PWD/.npm-install-args"\nmkdir -p "$PWD/node_modules/expo" "$PWD/node_modules/react"\nprintf "{}\\n" > "$PWD/node_modules/expo/package.json"\nprintf "{}\\n" > "$PWD/node_modules/react/package.json"\n',
  );
  chmodSync(npm, 0o755);

  return spawnSync(process.execPath, [bootstrapScript, mode], {
    cwd: worktree,
    encoding: 'utf8',
    env: { ...env, PATH: `${bin}:${env.PATH ?? ''}` },
  });
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('worktree bootstrap', () => {
  it('links a missing env file from the primary checkout', () => {
    const { primary, worktree } = makeLinkedWorktree();
    writeFileSync(
      join(primary, '.env'),
      'EXPO_PUBLIC_SPRINGA_API_URL=https://example.test\n',
    );

    const result = runBootstrap(worktree);

    expect(result.status, result.stderr).toBe(0);
    expect(lstatSync(join(worktree, '.env')).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(worktree, '.env'), 'utf8')).toBe(
      'EXPO_PUBLIC_SPRINGA_API_URL=https://example.test\n',
    );
  });

  it('does not replace an existing worktree env file', () => {
    const { primary, worktree } = makeLinkedWorktree();
    writeFileSync(
      join(primary, '.env'),
      'EXPO_PUBLIC_SPRINGA_API_URL=https://primary.test\n',
    );
    writeFileSync(
      join(worktree, '.env'),
      'EXPO_PUBLIC_SPRINGA_API_URL=https://worktree.test\n',
    );

    const result = runBootstrap(worktree);

    expect(result.status, result.stderr).toBe(0);
    expect(lstatSync(join(worktree, '.env')).isSymbolicLink()).toBe(false);
    expect(readFileSync(join(worktree, '.env'), 'utf8')).toBe(
      'EXPO_PUBLIC_SPRINGA_API_URL=https://worktree.test\n',
    );
  });

  it('fails before Expo starts when the API URL is unavailable', () => {
    const { worktree } = makeLinkedWorktree();
    const env = { ...process.env };
    delete env.EXPO_PUBLIC_SPRINGA_API_URL;

    const result = runBootstrap(worktree, env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing EXPO_PUBLIC_SPRINGA_API_URL');
  });

  it('fails before Expo starts when the API URL is malformed', () => {
    const { worktree } = makeLinkedWorktree();
    writeFileSync(
      join(worktree, '.env'),
      'EXPO_PUBLIC_SPRINGA_API_URL=not-a-url\n',
    );
    const env = { ...process.env };
    delete env.EXPO_PUBLIC_SPRINGA_API_URL;

    const result = runBootstrap(worktree, env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing EXPO_PUBLIC_SPRINGA_API_URL');
  });

  it('production ignores a development-only API URL', () => {
    const { primary, worktree } = makeLinkedWorktree();
    writeFileSync(
      join(primary, '.env.development.local'),
      'EXPO_PUBLIC_SPRINGA_API_URL=https://development.example.test\n',
    );
    const env = { ...process.env };
    delete env.EXPO_PUBLIC_SPRINGA_API_URL;

    const result = runBootstrap(worktree, env, 'production');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing EXPO_PUBLIC_SPRINGA_API_URL');
    expect(() => lstatSync(join(worktree, '.env.development.local'))).toThrow();
  });

  it('installs npm dependencies even when Expo already exists', () => {
    const { primary, worktree } = makeLinkedWorktree();
    writeFileSync(
      join(primary, '.env'),
      'EXPO_PUBLIC_SPRINGA_API_URL=https://example.test\n',
    );
    expect(() => lstatSync(join(worktree, 'node_modules', 'react'))).toThrow();

    const result = runBootstrap(worktree);

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(worktree, '.npm-install-args'), 'utf8')).toBe('install\n');
    expect(lstatSync(join(worktree, 'node_modules', 'react', 'package.json')).isFile()).toBe(true);
  });
});
