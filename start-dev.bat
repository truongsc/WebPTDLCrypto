@echo off
echo Starting Crypto Dashboard Development Environment...

echo.
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting Flask backend on http://localhost:5000...
start "Flask Backend" cmd /k "python main.py"

echo.
echo Flask server is starting...
echo Dashboard: http://localhost:5000
echo API: http://localhost:5000/api/market-data
echo.
echo Press any key to exit...
pause > nul
