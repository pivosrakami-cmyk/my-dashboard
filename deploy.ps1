# Локальная сборка + деплой my-dashboard (сервер не тянет next build)
# Использование: powershell -File deploy.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "1/4 next build..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "2/4 prebuilt/..."
if (Test-Path prebuilt) { Remove-Item -Recurse -Force prebuilt }
New-Item -ItemType Directory -Path prebuilt\.next -Force | Out-Null
Copy-Item -Recurse .next\standalone\* prebuilt\
# standalone притаскивает .git — убрать, иначе git примет prebuilt за сабмодуль
if (Test-Path prebuilt\.git) { Remove-Item -Recurse -Force prebuilt\.git }
Copy-Item -Recurse .next\static prebuilt\.next\static
Copy-Item -Recurse public prebuilt\public

Write-Host "3/4 git push..."
git add -A
git -c user.name="Denis" -c user.email="globenko1@hopeww.org.ua" commit -m "deploy: prebuilt $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$tok = (Select-String -Path D:\Claude\_secrets\github.txt -Pattern '(ghp|github_pat)_[A-Za-z0-9_]+' -AllMatches).Matches[-1].Value
git push "https://x-access-token:$tok@github.com/pivosrakami-cmyk/my-dashboard.git" master

Write-Host "4/4 Coolify deploy..."
$ctok = (Select-String -Path D:\Claude\_secrets\coolify.txt -Pattern '[0-9]+\|[A-Za-z0-9]+' -AllMatches).Matches[-1].Value
Invoke-RestMethod -Uri "https://coolify.tochtonado.com/api/v1/deploy?uuid=qioqh3h6krmadaua7bjktu2o&force=true" -Headers @{Authorization="Bearer $ctok"} | Out-Null
Write-Host "Готово — следи за статусом в Coolify."
