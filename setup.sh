#!/bin/bash
echo "🔧 Setting up Python backend..."
cd ml-backend

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend setup complete."
cd ..

echo "🔧 Setting up React frontend..."
cd ml-frontend
npm install

echo "✅ Frontend setup complete."

echo "🚀 Starting backend..."
cd ../ml-backend
source venv/bin/activate
gnome-terminal -- bash -c "python app.py; exec bash"

echo "🚀 Starting frontend..."
cd ../ml-frontend
npm start
