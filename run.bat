@echo off
echo 透過虛擬環境啟動伺服器...
call ".venv/Scripts/activate.bat"
call pip install -r requirements.txt
start "" python server.py && start "" run_web_server.bat
pause