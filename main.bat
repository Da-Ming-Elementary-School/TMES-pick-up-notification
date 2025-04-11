@echo off
chcp 65001
goto init

:init
echo "1. 更新並執行 WS 伺服器"
echo "2. 執行 WS 伺服器"
echo "3. 更新 WS 伺服器"
echo "4. 安裝 Python 需求套件"
echo "5. 完整安裝 (虛擬環境、"
choice /c 12345 /m "請選擇："

if ERRORLEVEL 5 goto install
if ERRORLEVEL 4 goto install_pkgs
if ERRORLEVEL 3 goto update
if ERRORLEVEL 2 goto run
if ERRORLEVEL 1 goto update_and_run

echo "輸入無效，請重新選擇"
goto init

:update_and_run
update.bat
run.bat

:run
run.bat

:update
update.bat

:install_pkgs
echo "install_pkgs"
exit

:install
echo "install"
exit