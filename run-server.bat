@echo off
echo Building and starting the Snake Game server...

cd backend

echo Installing dependencies...
set GOCACHE=d:\code\cc_test\.gocache
set GOMODCACHE=d:\code\cc_test\.gomodcache
set GOPROXY=https://goproxy.cn,direct
go mod tidy

echo Building server...
go build -o server.exe ./cmd/server

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo Starting server...
start "Snake Game Server" server.exe

echo Server started on http://localhost:8081
echo Open frontend in browser to play the game!

cd ..

pause
