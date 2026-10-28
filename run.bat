@echo off
setlocal
cd /d "%~dp0"

echo =====================================================
echo         SMART MEDICAL APPOINTMENT - RDV SANTE
echo         Module 3 : Gestion du Stock Medecin
echo =====================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'a pas ete trouve dans le PATH.
    echo Installez Node.js depuis https://nodejs.org/ puis relancez.
    echo.
    pause
    exit /b 1
)

if not exist ".env.local" (
    echo [INFO] Creation du fichier .env.local...
    (
        echo MONGODB_URI=mongodb://localhost:27017/sante-rdv
        echo ALLOW_DEMO_LOGIN=true
    ) > .env.local
)

if not exist "node_modules" (
    echo [INFO] Installation des dependances...
    call npm install
)

echo.
echo Que souhaitez-vous faire ?
echo   1. Lancer le projet [Par defaut]
echo   2. Initialiser les donnees de demo [seed] puis lancer
echo   3. Lancer les tests API
echo   4. Quitter
echo.
set "CHOICE=1"
set /p "CHOICE=Entrez votre choix [1]: "

if "%CHOICE%"=="2" goto do_seed
if "%CHOICE%"=="3" goto do_test
if "%CHOICE%"=="4" goto do_exit
goto do_run

:do_seed
echo.
echo [INFO] Initialisation des donnees dans MongoDB...
call npm run seed
if %errorlevel% neq 0 (
    echo [ATTENTION] Le seed a echoue. Verifiez que MongoDB est bien demarre.
    echo.
)

:do_run
echo.
echo [INFO] Demarrage de l'application...
echo [INFO] Ouverture du navigateur sur http://localhost:3000
start http://localhost:3000
call npm run dev
pause
goto do_exit

:do_test
echo.
echo [INFO] Lancement des tests...
call npm run test:api
pause
goto do_exit

:do_exit
endlocal
exit /b 0
