import { spawnSync } from 'node:child_process';

function quoteShellArg(value) {
  if (/^[\w:./\\-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function run(command, args, options = {}) {
  const label = [command, ...args].join(' ');
  console.log(`\n> ${label}`);
  const needsShell = process.platform === 'win32' && ['npm', 'npx'].includes(command);
  const result = spawnSync(
    needsShell ? [command, ...args].map(quoteShellArg).join(' ') : command,
    needsShell ? [] : args,
    {
      stdio: options.capture ? 'pipe' : 'inherit',
      encoding: 'utf8',
      shell: needsShell,
    },
  );

  if (result.error) {
    console.error(result.error.message);
  }

  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

run('npm', ['test']);
run('npm', ['run', 'build']);
run('npx', ['tauri', 'info'], { allowFailure: true });

const cargo = run('cargo', ['--version'], {
  capture: true,
  allowFailure: true,
});

if (cargo.status !== 0) {
  console.warn(
    '\nSkipping tauri build: Rust/Cargo is not installed or not on PATH. Install Rust 1.77.2+ and rerun npm run desktop:verify.',
  );
  process.exit(0);
}

run('npm', ['run', 'tauri:build']);
