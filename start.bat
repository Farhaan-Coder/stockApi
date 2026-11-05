@echo off
echo Starting StockApp Server on http://localhost:7600...
start "" "http://localhost:7600/stock.html"
npx json-server stock.json -p 7600 -s .
pause
