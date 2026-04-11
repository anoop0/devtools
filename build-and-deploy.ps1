# Build and Deploy to docs folder script
Write-Host "Building React app..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Copying build to docs folder..." -ForegroundColor Cyan

# Remove old docs folder if exists
if (Test-Path docs) {
  Remove-Item docs -Recurse -Force
  Write-Host "Removed old docs folder" -ForegroundColor Yellow
}

# Copy build output to docs folder
Copy-Item -Path build -Destination docs -Recurse -Force
Write-Host "Copied build to docs/" -ForegroundColor Green

# Create .nojekyll file
New-Item -Path docs\.nojekyll -ItemType File -Force | Out-Null
Write-Host "Created docs/.nojekyll" -ForegroundColor Green

Write-Host ""
Write-Host "✓ Build and deployment complete!" -ForegroundColor Green
Write-Host "Commit and push docs/ to deploy on GitHub Pages (main branch, /docs)" -ForegroundColor Cyan
