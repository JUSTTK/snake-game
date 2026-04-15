@echo off
echo Starting Snake Game Production Environment...

docker-compose up --build -d

echo Services started!
echo Frontend: http://localhost
echo Backend: http://localhost:8080

pause