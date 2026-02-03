# Speed Apply: Master Startup Script

Write-Host "🚀 INITIALIZING HYPER-FAST AI JOB AGENT" -ForegroundColor Cyan

# 1. Start Python Agent
Write-Host "🐍 Starting Python Agent (Browser-Use) on port 8012..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd python-agent; .\.venv\Scripts\python.exe .\main.py"

# 2. Start Backend
Write-Host "🟢 Starting Node.js Backend on port 5011..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; node server.js"

# 3. Start Frontend
Write-Host "💻 Starting React Frontend on port 5173..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "──────────────────────────────────────────"
Write-Host "✅ ALL SYSTEMS DEPLOYED" -ForegroundColor Green
Write-Host "1. Frontend: http://localhost:5173"
Write-Host "2. Backend: http://localhost:5011"
Write-Host "3. Python Agent: http://localhost:8012"
Write-Host "──────────────────────────────────────────"
