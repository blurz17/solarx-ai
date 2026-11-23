# Start SolarX AI Backend (port 8000) and Frontend (port 5173) locally
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; `$env:OPENBLAS_NUM_THREADS='1'; uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting React Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "Done! Open http://localhost:5173 in your browser." -ForegroundColor Green
