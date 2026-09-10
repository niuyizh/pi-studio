@echo off
title Pi Studio
cd /d "%~dp0"

rem 可用 node-path.txt（一行，写 node.exe 的完整路径）覆盖自动查找
set "NODE="
if exist "%~dp0node-path.txt" set /p NODE=<"%~dp0node-path.txt"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE set "NODE=node"

echo Starting Pi Studio with: %NODE%
echo (close this window to stop the server)
echo.
"%NODE%" "%~dp0server.mjs" %*
echo.
echo Server stopped.
pause
