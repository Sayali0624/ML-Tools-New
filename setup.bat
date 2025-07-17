@echo off
setlocal enabledelayedexpansion

:: ----------- STEP 1: Check if Python is installed -----------
python --version >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Python is not installed.
echo Please install Python 3.10 or higher from https://www.python.org/downloads/
pause
exit /b
)

:: ----------- STEP 2: Check if pip is available -----------
pip --version >nul 2>&1
if %errorlevel% neq 0 (
echo [INFO] pip not found. Attempting to install pip...
python -m ensurepip
)

:: ----------- STEP 3: Check if Node.js is installed -----------
node -v >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] Node.js is not installed.
echo Please install Node.js LTS version from https://nodejs.org/
pause
exit /b
)

:: ----------- STEP 4: Check if npm is available -----------
npm -v >nul 2>&1
if %errorlevel% neq 0 (
echo [ERROR] npm not found. Check your Node.js installation.
pause
exit /b
)

:: ----------- STEP 5: Backend Setup -----------
echo [✓] Setting up Python backend...
cd ml-backend

:: Create venv if not exists
if not exist venv (
echo Creating Python virtual environment...
python -m venv venv
)

call venv\Scripts\activate

echo Installing Python requirements...
pip install --upgrade pip
pip install -r requirements.txt

cd ..

:: ----------- STEP 6: Frontend Setup -----------
echo [✓] Setting up React frontend...
cd ml-frontend
if exist node_modules (
echo Skipping npm install (node_modules exists)
) else (
npm install
)
cd ..

:: ----------- STEP 7: Launch frontend and backend ----------
echo [✓] Launching frontend and backend in separate terminals...

start "ML Tools Backend" cmd /k "cd ml-backend && call venv\Scripts\activate && python app.py"
start "ML Tools Frontend" cmd /k "cd ml-frontend && npm start"

echo [✓] ML Tools is launching...
echo You can now use the web app in your browser (http://localhost:3000)
pause
