@echo off
setlocal enabledelayedexpansion

:: Check for Python
python --version >nul 2>&1
if errorlevel 1 (
echo [!] Python not found. Please install Python 3.x from https://www.python.org/downloads/
pause
exit /b
)

:: Check for pip
pip --version >nul 2>&1
if errorlevel 1 (
echo [!] pip not found. Installing pip...
python -m ensurepip
)

:: Check for Node.js
node -v >nul 2>&1
if errorlevel 1 (
echo [!] Node.js not found.
echo Please install Node.js LTS from https://nodejs.org/en/download
pause
exit /b
)

:: Check for npm
npm -v >nul 2>&1
if errorlevel 1 (
echo [!] npm not found.
pause
exit /b
)

:: Check for CMake
where cmake >nul 2>&1
if errorlevel 1 (
echo [!] CMake not found.
echo Please install CMake from https://cmake.org/download/ and add to PATH
pause
)

:: Setup Backend
echo [✓] Setting up backend...
cd ml-backend

if not exist venv (
echo Creating virtual environment...
python -m venv venv
)

call venv\Scripts\activate

echo Installing backend Python dependencies...
pip install --upgrade pip
pip install -r requirements.txt

cd ..

:: Setup Frontend
echo [✓] Setting up frontend...
cd ml-frontend

echo Installing frontend dependencies...
npm install

cd ..

:: Launch Backend
start "MLTools Backend" cmd /k "cd ml-backend && call venv\Scripts\activate && python app.py"

:: Launch Frontend
start "MLTools Frontend" cmd /k "cd ml-frontend && npm start"

echo.
echo [✓] Project launched successfully in two terminals.
echo Close this window and use the opened terminals to interact with ML Tools.
