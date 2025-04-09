@echo off
echo 透過虛擬環境啟動伺服器...
".venv/Scripts/activate.bat" && python server.py
pause