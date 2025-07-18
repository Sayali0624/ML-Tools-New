@echo off
setlocal enabledelayedexpansion

echo =====================================================
echo ML Tools Setup - Windows Environment
echo =====================================================

:: ---------------------------
:: Step 0 - Ensure Admin Rights
:: ---------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Please run this script as Administrator.
  pause
  exit /b
)

:: ---------------------------
:: Step 1 - Check Python
:: ---------------------------
python --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Python is not installed.
  echo Install Python 3.10+ from https://www.python.org/downloads/
  pause
  exit /b
)

:: ---------------------------
:: Step 2 - Check pip
:: ---------------------------
pip --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] pip not found. Installing pip...
  python -m ensurepip
)

:: ---------------------------
:: Step 3 - Check Node.js
:: ---------------------------
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js from https://nodejs.org
  pause
  exit /b
)

:: ---------------------------
:: Step 4 - Backend Setup
:: ---------------------------
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
echo Upgrading pip...
python -m pip install --upgrade pip

:: ---------------------------
:: Install Visual Studio Build Tools and CMake (instructions only)
:: ---------------------------
echo.
echo ==============================================
echo ⚠️ Checking Visual Studio Build Tools & CMake...
echo ==============================================
where cmake >nul 2>&1
if %errorlevel% neq 0 (
  echo [WARNING] CMake not found. Install Visual Studio Build Tools with C++ build tools and CMake:
  echo https://visualstudio.microsoft.com/visual-cpp-build-tools/
  pause
)

:: ---------------------------
:: Install backend packages individually with retries
:: ---------------------------

echo Installing essential backend packages individually with retries...

:: Flask
pip install flask || pip install flask

:: Flask-Cors
pip install flask-cors || pip install flask-cors

:: TensorFlow
pip install tensorflow || pip install tensorflow

:: Keras
pip install keras || pip install keras

:: OpenCV
pip install opencv-python || pip install opencv-python

:: numpy
pip install numpy || pip install numpy

:: torch + torchvision + torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 || pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

:: timm
pip install timm || pip install timm

:: cmake (required for face_recognition)
pip install cmake || pip install cmake

:: dlib + face_recognition
pip install dlib face_recognition || pip install dlib face_recognition

:: ultralytics
pip install ultralytics || pip install ultralytics

cd ..

:: ---------------------------
:: Step 5 - Frontend Setup
:: ---------------------------
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

:: ---------------------------
:: Step 6 - Launch Servers
:: ---------------------------
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
