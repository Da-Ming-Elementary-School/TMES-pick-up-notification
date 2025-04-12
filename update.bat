@echo off
chcp 65001
echo 自動更新系統中...
git fetch --all
git reset --hard origin/main
git pull
@REM timeout /t 10