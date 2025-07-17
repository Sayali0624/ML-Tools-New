@echo off
setlocal enabledelayedexpansion

echo =====================================================
echo 🔧 ML Tools Setup - Windows Environment
echo =====================================================

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Python is not installed.
echo Please install Python 3.10+ from https://www.python.org/downloads/
pause
exit /b
)

:: Ensure pip is available
pip --version >nul 2>&1
if %errorlevel% neq 0 (
echo [INFO] pip not found. Installing pip...
python -m ensurepip
)

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Node.js is not installed.
echo Please install Node.js from https://nodejs.org/
pause
exit /b
)

:: Check npm
npm -v >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] npm not available. Please reinstall Node.js.
pause
exit /b
)

echo ==============================================
echo 🐍 Setting up Python backend dependencies...
echo ==============================================

cd ml-backend

:: Create virtual environment if it doesn't exist
if not exist venv (
echo Creating virtual environment...
python -m venv venv
)

:: Activate and install backend requirements
call venv\Scripts\activate
echo Installing backend requirements...
pip install --upgrade pip
pip install -r requirements.txt

cd ..

echo ==============================================
echo 🧠 Setting up React frontend...
echo ==============================================

cd ml-webcam-app

if exist node_modules (
echo node_modules found. Skipping npm install...
) else (
echo Installing frontend dependencies...
npm install
)

cd ..

echo ==============================================
echo 🚀 Launching ML Tools (backend + frontend)...
echo ==============================================

start "ML Tools Backend" cmd /k "cd ml-backend && call venv\Scripts\activate && python app.py"
start "ML Tools Frontend" cmd /k "cd ml-webcam-app && npm start"

echo =====================================================
echo ✅ ML Tools is now running at http://localhost:3000
echo =====================================================
pause
