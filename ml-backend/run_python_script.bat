@echo off
REM This batch file activates the Python virtual environment
REM and then runs the process_image.py script.

REM --- DEBUGGING START ---
echo DEBUG: Current directory before CD: %cd%
echo DEBUG: Batch file path: %~dp0
REM --- DEBUGGING END ---

REM Change directory to the location of this batch file (ml-backend)
cd /d "%~dp0"

REM --- DEBUGGING START ---
echo DEBUG: Current directory after CD: %cd%
echo DEBUG: Listing contents of current directory:
dir /b
echo DEBUG: Listing contents of venv directory:
dir /b venv
echo DEBUG: Listing contents of venv\Scripts directory:
dir /b venv\Scripts
echo DEBUG: Attempting to activate: %cd%\venv\Scripts\activate.bat
REM --- DEBUGGING END ---

REM Activate the virtual environment
call venv\Scripts\activate.bat
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to activate virtual environment. Check path: venv\Scripts\activate.bat
    REM Pause here to see the error if activation fails
    pause
    goto :eof
)

REM --- DEBUGGING START ---
echo DEBUG: Virtual environment activated.
REM Use the %VIRTUAL_ENV% variable set by activate.bat for explicit Python path
echo DEBUG: Using Python executable: "%VIRTUAL_ENV%\Scripts\python.exe"
echo DEBUG: Attempting to run Python script: "%VIRTUAL_ENV%\Scripts\python.exe" process_image.py
echo DEBUG: Listing contents of current directory (after venv activation):
dir /b
REM --- DEBUGGING END ---

REM Execute the Python script, passing stdin and capturing stdout/stderr
REM The Python script expects JSON input on stdin and prints JSON output to stdout.
REM We redirect stdin from the Node.js process and stdout back to Node.js.
"%VIRTUAL_ENV%\Scripts\python.exe" process_image.py %*
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python script exited with an error.
    REM Pause here to see the error if Python script fails
    pause
    goto :eof
)

REM Deactivate the virtual environment (optional, but good practice if not exiting)
REM deactivate

REM --- DEBUGGING START ---
echo DEBUG: Batch script finished successfully.
REM Pause for debugging when run manually. Node.js won't see this.
pause
REM --- DEBUGGING END ---
