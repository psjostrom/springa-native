import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const mode = process.argv[2] ?? 'development';
const envFilesByMode = {
  development: ['.env', '.env.local', '.env.development', '.env.development.local'],
  production: ['.env', '.env.local', '.env.production', '.env.production.local'],
};
const envFiles = envFilesByMode[mode];

if (!envFiles) {
  throw new Error(`Unsupported Expo environment mode: ${mode}`);
}

function exists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function hasApiUrl(path) {
  if (!exists(path)) return false;

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .some((line) => {
      const value = line.match(
        /^\s*(?:export\s+)?EXPO_PUBLIC_SPRINGA_API_URL\s*=\s*(.*)$/,
      )?.[1].trim();
      return Boolean(value && value !== "''" && value !== '""' && !value.startsWith('#'));
    });
}

const worktree = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const commonGitDirectory = execFileSync(
  'git',
  ['rev-parse', '--path-format=absolute', '--git-common-dir'],
  { encoding: 'utf8' },
).trim();
const primary = resolve(dirname(commonGitDirectory));

if (resolve(worktree) !== primary) {
  for (const file of envFiles) {
    const source = join(primary, file);
    const destination = join(worktree, file);
    if (exists(source) && !exists(destination)) {
      symlinkSync(source, destination);
      console.log(`Linked ${file} from primary checkout.`);
    }
  }
}

if (
  !process.env.EXPO_PUBLIC_SPRINGA_API_URL &&
  !envFiles.some((file) => hasApiUrl(join(worktree, file)))
) {
  console.error(
    `Missing EXPO_PUBLIC_SPRINGA_API_URL. Add it to ${join(primary, '.env')} or a standard .env file in this worktree.`,
  );
  process.exit(1);
}

console.log('Installing npm dependencies...');
const install = spawnSync('npm', ['install'], { cwd: worktree, stdio: 'inherit' });
if (install.error) throw install.error;
if (install.status !== 0) process.exit(install.status ?? 1);
