@echo off
REM Build the React app
npm run build

REM Remove old docs folder if exists
if exist docs rmdir /s /q docs

REM Copy build output to docs folder
xcopy build docs /E /H /C /I

REM Create .nojekyll in docs
copy NUL docs\.nojekyll

echo Build copied to docs/. Commit and push docs/ to deploy on GitHub Pages (main branch, /docs).
