@echo off
echo ==========================================
echo   Souza Car - Automacao de Git Vibe
echo ==========================================
echo.
echo 1. Inicializando Repositorio...
"C:\Program Files\Git\cmd\git.exe" init

echo 1.5 Configurando Usuario Temporario...
"C:\Program Files\Git\cmd\git.exe" config --local user.name "Souza Veiculos Admin"
"C:\Program Files\Git\cmd\git.exe" config --local user.email "admin@souzaveiculos.com"

echo.
echo 2. Adicionando todos os arquivos...
"C:\Program Files\Git\cmd\git.exe" add .

echo.
echo 2.5 Rodando Guard de Qualidade...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\guard_publish.ps1"
if errorlevel 1 (
    echo.
    echo ==========================================
    echo   ERRO: Guard bloqueou o commit.
    echo   Corrija os itens acima e tente novamente.
    echo ==========================================
    echo.
    pause
    exit /b 1
)

echo.
echo 3. Criando Commit "Vibe Coding Complete"...
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: Souza Car Complete System (Admin, Filters, LocalStorage)"

echo.
echo ==========================================
echo   SUCESSO! O projeto foi commitado.
echo ==========================================
echo.
echo Para subir para o GitHub, crie um repositorio la e rode:
echo "C:\Program Files\Git\cmd\git.exe" remote add origin URL_DO_SEU_REPO
echo "C:\Program Files\Git\cmd\git.exe" push -u origin master
echo.
pause
