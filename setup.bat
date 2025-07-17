@echo off
setlocal enabledelayedexpansion

echo =====================================================
echo ML Tools Setup - Windows Environment
echo =====================================================

:: Step 1 - Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Python is not installed.
echo Install Python 3.10+ from https://www.python.org/downloads/
pause
exit /b
)

:: Step 2 - Check pip
pip --version >nul 2>&1
if %errorlevel% neq 0 (
echo [INFO] pip not found. Installing pip...
python -m ensurepip
)

:: Step 3 - Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Node.js is not installed.
echo Install Node.js from https://nodejs.org
pause
exit /b
)

:: Step 4 - Backend Setup
echo.
echo ==============================================
echo 🐍 Setting up Python backend...
echo ==============================================

cd ml-backend

if not exist venv (
echo Creating virtual environment...
python -m venv venv
)

call venv\Scripts\activate
echo Installing backend requirements...
pip install --upgrade pip
pip install -r requirements.txt
cd ..

:: Step 5 - Frontend Setup
echo.
echo ==============================================
echo ⚛️ Setting up React frontend...
echo ==============================================

cd ml-webcam-app
if not exist node_modules (
echo Installing React packages...
npm install
)
cd ..

:: Step 6 - Launch Servers
echo.
echo ==============================================
echo 🚀 Launching ML Tools...
echo ==============================================

start "Backend" cmd /k "cd ml-backend && call venv\Scripts\activate && python app.py"
start "Frontend" cmd /k "cd ml-webcam-app && npm start"

echo =====================================================
echo ✅ ML Tools started at http://localhost:3000
echo =====================================================
pause
