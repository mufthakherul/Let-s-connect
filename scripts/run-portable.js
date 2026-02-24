const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scripts = {
    'test-performance': {
        shell: 'test-performance.sh',
        windowsPsFallback: 'test-performance.ps1'
    },
    'monitor-cache': {
        shell: 'monitor-cache.sh',
        windowsPsFallback: 'monitor-cache.ps1'
    },
    // init-databases.sh runs inside postgres container via docker-entrypoint.
    // Keep shell only to avoid introducing risky host-side DB mutations.
    'init-databases': {
        shell: 'init-databases.sh'
    }
};

function detectEnvironment() {
    const platform = process.platform;
    const isTermux = platform === 'linux' && (process.env.TERMUX_VERSION || (process.env.PREFIX || '').includes('com.termux'));
    const isMac = platform === 'darwin';
    const isWindows = platform === 'win32';
    const isLinux = platform === 'linux' && !isTermux;

    let label = platform;
    if (isTermux) label = 'android-termux';
    else if (isMac) label = 'macOS';
    else if (isWindows) label = 'windows';
    else if (isLinux) label = 'linux';

    return { platform, isWindows, isTermux, label };
}

function commandExists(cmd) {
    const checkCmd = process.platform === 'win32' ? 'where' : 'command';
    const checkArgs = process.platform === 'win32' ? [cmd] : ['-v', cmd];
    const result = spawnSync(checkCmd, checkArgs, { stdio: 'ignore', shell: process.platform !== 'win32' });
    return result.status === 0;
}

function usage() {
    console.log('Usage: node scripts/run-portable.js <script-name> [args...]');
    console.log('');
    console.log('Available script-name values:');
    Object.keys(scripts).forEach((k) => console.log(`  - ${k}`));
}

function runCommand(command, args) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    process.exit(result.status ?? 1);
}

function run() {
    const [, , scriptName, ...restArgs] = process.argv;

    if (!scriptName || scriptName === '--help' || scriptName === '-h') {
        usage();
        process.exit(0);
    }

    const scriptConfig = scripts[scriptName];
    if (!scriptConfig) {
        console.error(`[portable-run] Unknown script: ${scriptName}`);
        usage();
        process.exit(1);
    }

    const shellScriptPath = path.resolve(__dirname, scriptConfig.shell);
    if (!fs.existsSync(shellScriptPath)) {
        console.error(`[portable-run] Shell script not found: ${shellScriptPath}`);
        process.exit(1);
    }

    const envInfo = detectEnvironment();
    console.log(`[portable-run] Detected environment: ${envInfo.label}`);

    if (envInfo.isWindows) {
        // Preferred on Windows: bash (Git Bash / WSL bash in PATH).
        if (commandExists('bash')) {
            console.log('[portable-run] Using bash on Windows.');
            runCommand('bash', [shellScriptPath, ...restArgs]);
        }

        // Fallback path: native PowerShell for scripts with known-safe translations.
        if (scriptConfig.windowsPsFallback) {
            const psScriptPath = path.resolve(__dirname, scriptConfig.windowsPsFallback);
            if (!fs.existsSync(psScriptPath)) {
                console.error(`[portable-run] PowerShell fallback script not found: ${psScriptPath}`);
                process.exit(1);
            }

            const psExe = commandExists('pwsh') ? 'pwsh' : (commandExists('powershell') ? 'powershell' : null);
            if (!psExe) {
                console.error('[portable-run] Neither bash nor PowerShell runtime was found.');
                process.exit(1);
            }

            console.log(`[portable-run] Using PowerShell fallback (${path.basename(psScriptPath)}).`);
            runCommand(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath, ...restArgs]);
        }

        console.error(`[portable-run] No safe PowerShell fallback is available for '${scriptName}'.`);
        console.error('[portable-run] Install Git Bash/WSL and ensure `bash` is in PATH.');
        process.exit(1);
    }

    // Linux/macOS/Termux/Harmony-like Unix environments.
    if (commandExists('bash')) {
        runCommand('bash', [shellScriptPath, ...restArgs]);
    }

    // Minimal fallback for Unix systems where bash is absent.
    if (commandExists('sh')) {
        console.log('[portable-run] bash not found; falling back to sh.');
        runCommand('sh', [shellScriptPath, ...restArgs]);
    }

    console.error('[portable-run] Neither bash nor sh is available on this system.');
    process.exit(1);
}

run();
