@echo off
title RollSet calibration
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Page calibrate.html
pause
