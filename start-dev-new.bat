@echo off
echo ========================================
echo   Starting Crypto Analysis Dashboard
echo ========================================

echo Checking if dependencies are installed...
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo Starting Backend Server...
start "Backend" cmd /k "cd backend && npm start"

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm start"

echo ========================================
echo   Servers Starting...
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo The frontend will automatically open in your browser.
echo If not, manually open: http://localhost:3000
echo Press any key to exit this window...
pause > nul
