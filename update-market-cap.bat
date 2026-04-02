@echo off
echo ========================================
echo   Update Market Cap Data
echo ========================================
echo.

echo 💰 Updating market cap for 50 tokens...
python get_market_cap_safe.py

echo.
echo ✅ Market cap update completed!
echo.
pause
