@echo off
chcp 65001
goto init

:init
@REM echo 1. 更新並執行 WS 伺服器
echo 1. 執行 WS 伺服器
echo 2. 更新 WS 伺服器
echo 3. 安裝 Python 需求套件
echo 4. 完整安裝 (虛擬環境、
choice /c 12345 /m "請選擇："

if %ERRORLEVEL% EQU 4 goto install
if %ERRORLEVEL% EQU 3 goto install_pkgs
if %ERRORLEVEL% EQU 2 goto update
if %ERRORLEVEL% EQU 1 goto run
@REM if %ERRORLEVEL% EQU 1 goto update_and_run

:update_and_run
update.bat
echo "update_and_run finished"
run.bat

:run
run.bat
goto end

:update
update.bat
goto end

:install_pkgs
where /q deactivate >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    "./.venv/Scripts/activate.bat" && pip install -U -r requirements.txt && deactivate
) else (
    pip install -U -r requirements.txt
)
goto end

:install
echo "install"
goto end

:end
echo END
pause
