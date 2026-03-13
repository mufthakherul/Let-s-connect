@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\..") do set "ROOT_DIR=%%~fI"
call "%ROOT_DIR%\admin\cli\admin-cli.bat" %*
exit /b %ERRORLEVEL%
