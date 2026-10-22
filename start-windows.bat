@echo off
title RollSet
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
pause
