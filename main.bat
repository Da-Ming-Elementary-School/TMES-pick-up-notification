@echo off
chcp 65001
goto init

:init
echo 1. 更新並執行 WS 伺服器
echo 2. 執行 WS 伺服器
echo 3. 更新 WS 伺服器
echo 4. 安裝 Python 需求套件
echo 5. 完整安裝 (虛擬環境、
choice /c 12345 /m "請選擇："

if %ERRORLEVEL% EQU 5 goto install
if %ERRORLEVEL% EQU 4 goto install_pkgs
if %ERRORLEVEL% EQU 3 goto update
if %ERRORLEVEL% EQU 2 goto run
if %ERRORLEVEL% EQU 1 goto update_and_run

:update_and_run
update.bat

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
