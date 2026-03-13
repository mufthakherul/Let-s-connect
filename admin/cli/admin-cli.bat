@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\..\..") do set "ROOT_DIR=%%~fI"
set "CLI_DIR=%ROOT_DIR%\admin\cli"

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  node "%CLI_DIR%\index.js" %*
  exit /b %ERRORLEVEL%
)

where docker >nul 2>nul
if %ERRORLEVEL%==0 (
  docker run --rm -it -v "%ROOT_DIR%:/workspace" -w /workspace/admin/cli node:20-alpine sh -lc "npm ci --omit=dev >/dev/null 2>&1 || npm install --omit=dev >/dev/null 2>&1; node index.js %*"
  exit /b %ERRORLEVEL%
)

echo Error: Node.js is not installed and Docker is unavailable. 1>&2
echo Install Node.js ^>=18 or Docker to run the admin CLI. 1>&2
exit /b 1
