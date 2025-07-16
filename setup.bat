@echo off
cd ml-backend
python -m venv venv
call venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
echo Backend setup done.
cd ..

cd ml-frontend
npm install
echo Frontend setup done.

start cmd /k "cd ml-backend && call venv\Scripts\activate && python app.py"
start cmd /k "cd ml-frontend && npm start"
