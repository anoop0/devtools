@echo off
REM Build and Deploy to docs folder

echo.
echo Building React app...
call npm run build

if errorlevel 1 (
  echo Build failed!
  exit /b 1
)

echo Build completed successfully!
echo.
echo Copying build to docs folder...

REM Remove old docs folder if exists
if exist docs (
  echo Removing old docs folder...
  rmdir /s /q docs
)

REM Copy build output to docs folder
xcopy build docs /E /H /C /I /Y

REM Create .nojekyll in docs
copy NUL docs\.nojekyll

echo.
echo Build and deployment complete!
echo Commit and push docs/ to deploy on GitHub Pages (main branch, /docs).
echo.
pause
