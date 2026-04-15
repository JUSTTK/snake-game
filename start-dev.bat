@echo off
echo Starting Snake Game Development Environment...

cd backend
set GOCACHE=d:\code\cc_test\.gocache
set GOMODCACHE=d:\code\cc_test\.gomodcache
set GOPROXY=https://goproxy.cn,direct
go mod tidy
start "Snake Game Server" cmd /k "go run ./cmd/server"
cd ..

cd frontend
start "Snake Game Frontend" cmd /k "npm run dev -- --host"
cd ..

pause
