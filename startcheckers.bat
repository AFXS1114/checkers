@echo off
setlocal EnableDelayedExpansion

title CHECKERS // DEVELOPMENT
color 0B
mode con: cols=90 lines=34

:: ============================================================
:: CHECKERS DEVELOPMENT LAUNCHER
:: ============================================================

set "ROOT=D:\000000. CODING PROJECTS\checkers"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

set "URL=http://localhost:5173/add-transaction"

set "BACKEND_LOG=%ROOT%\backend.log"
set "FRONTEND_LOG=%ROOT%\frontend.log"

cls

:: ============================================================
:: BOOT ANIMATION
:: ============================================================

echo.
echo   ================================================================
echo.
echo        C H E C K E R S   //   D E V E L O P M E N T
echo.
echo        Initializing development environment...
echo.
echo   ================================================================
echo.

set "bar="

for /L %%A in (1,1,30) do (
    set "bar=!bar!#"
    <nul set /p "=   [!bar!] %%A%%"
    ping 127.0.0.1 -n 1 -w 120 >nul
    echo.
)

:: ============================================================
:: ENVIRONMENT CHECK
:: ============================================================

timeout /t 1 /nobreak >nul

cls

echo.
echo   ================================================================
echo        CHECKERS // ENVIRONMENT CHECK
echo   ================================================================
echo.

if not exist "%ROOT%" (
    color 0C
    echo   [ERROR] Root folder not found:
    echo.
    echo   %ROOT%
    echo.
    pause
    exit /b 1
)

if not exist "%BACKEND%\package.json" (
    color 0C
    echo   [ERROR] Backend package.json not found.
    echo.
    echo   %BACKEND%
    echo.
    pause
    exit /b 1
)

if not exist "%FRONTEND%\package.json" (
    color 0C
    echo   [ERROR] Frontend package.json not found.
    echo.
    echo   %FRONTEND%
    echo.
    pause
    exit /b 1
)

echo   [ OK ] Root       : %ROOT%
echo   [ OK ] Backend    : %BACKEND%
echo   [ OK ] Frontend   : %FRONTEND%
echo.

timeout /t 1 /nobreak >nul

:: ============================================================
:: WARNING
:: ============================================================

cls
color 0E

echo.
echo   ╔════════════════════════════════════════════════════════════════════╗
echo   ║                                                                    ║
echo   ║                       ! !  WARNING  ! !                            ║
echo   ║                                                                    ║
echo   ║       DO NOT CLOSE THIS CMD WINDOW WHILE CHECKERS IS RUNNING.     ║
echo   ║                                                                    ║
echo   ║       This window controls the Backend and Frontend servers.     ║
echo   ║                                                                    ║
echo   ║       Closing this window will stop the development environment.  ║
echo   ║                                                                    ║
echo   ╚════════════════════════════════════════════════════════════════════╝
echo.

timeout /t 2 /nobreak >nul

:: ============================================================
:: START BACKEND
:: ============================================================

color 0B

cls

echo.
echo   ================================================================
echo        CHECKERS // STARTING DEVELOPMENT SERVICES
echo   ================================================================
echo.
echo   [BOOT] Starting BACKEND...
echo.

start "" /b cmd /c "cd /d "%BACKEND%" && echo [BACKEND STARTED] > "%BACKEND_LOG%" && npm run dev >> "%BACKEND_LOG%" 2>&1"

timeout /t 1 /nobreak >nul

echo   [ OK ] Backend process launched.
echo.

:: ============================================================
:: START FRONTEND
:: ============================================================

echo   [BOOT] Starting FRONTEND...
echo.

start "" /b cmd /c "cd /d "%FRONTEND%" && echo [FRONTEND STARTED] > "%FRONTEND_LOG%" && npm run dev >> "%FRONTEND_LOG%" 2>&1"

timeout /t 1 /nobreak >nul

echo   [ OK ] Frontend process launched.
echo.

:: ============================================================
:: WAIT FOR DEVELOPMENT SERVERS
:: ============================================================

echo   [WAIT] Starting development environment...
echo.

set "dots="

for /L %%A in (1,1,8) do (
    set "dots=!dots!."
    <nul set /p "=   [%%A/8] !dots!"
    ping 127.0.0.1 -n 1 -w 350 >nul
    echo.
)

:: ============================================================
:: OPEN FRONTEND
:: ============================================================

echo.
echo   [OPEN] Launching application...
echo.

timeout /t 1 /nobreak >nul

start "" "%URL%"

timeout /t 1 /nobreak >nul

:: ============================================================
:: DEVELOPMENT DASHBOARD
:: ============================================================

cls
color 0A

echo.
echo   ╔════════════════════════════════════════════════════════════════════╗
echo   ║                                                                    ║
echo   ║             C H E C K E R S   //   D E V   M O D E                ║
echo   ║                                                                    ║
echo   ╠════════════════════════════════════════════════════════════════════╣
echo   ║                                                                    ║
echo   ║   BACKEND          [ ● RUNNING ]                                  ║
echo   ║                                                                    ║
echo   ║   FRONTEND         [ ● RUNNING ]                                  ║
echo   ║                                                                    ║
echo   ╠════════════════════════════════════════════════════════════════════╣
echo   ║                                                                    ║
echo   ║   APPLICATION                                                          ║
echo   ║                                                                    ║
echo   ║   %URL%
echo   ║                                                                    ║
echo   ╠════════════════════════════════════════════════════════════════════╣
echo   ║                                                                    ║
echo   ║   PROJECT                                                              ║
echo   ║                                                                    ║
echo   ║   %ROOT%
echo   ║                                                                    ║
echo   ╠════════════════════════════════════════════════════════════════════╣
echo   ║                                                                    ║
echo   ║   LOG FILES                                                         ║
echo   ║                                                                    ║
echo   ║   Backend  : backend.log                                            ║
echo   ║   Frontend : frontend.log                                           ║
echo   ║                                                                    ║
echo   ╠════════════════════════════════════════════════════════════════════╣
echo   ║                                                                    ║
echo   ║              ! ! !  DO NOT CLOSE THIS WINDOW  ! ! !               ║
echo   ║                                                                    ║
echo   ║        This CMD window keeps the development environment          ║
echo   ║        running. Closing it will stop the servers.                 ║
echo   ║                                                                    ║
echo   ╚════════════════════════════════════════════════════════════════════╝
echo.
echo   [SYSTEM] CHECKERS development environment is ONLINE.
echo.
echo   [SYSTEM] Keep this window open while developing.
echo.

:: ============================================================
:: KEEP CMD ALIVE
:: ============================================================

:LOOP

timeout /t 5 /nobreak >nul

goto LOOP