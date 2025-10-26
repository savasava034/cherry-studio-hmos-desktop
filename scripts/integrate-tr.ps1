Param(
    [string]$LocalI18nDir = "..\my-tr-i18n\src\renderer\src\i18n",
    [string]$Remote = "origin"
)

if (-not (Test-Path $LocalI18nDir)) {
    Write-Error "Yerel i18n dizini bulunamadı: $LocalI18nDir"
    exit 1
}

$branch = "add/tr-TR-i18n"
git checkout -b $branch

New-Item -ItemType Directory -Force -Path .\src\renderer\src\i18n\locales | Out-Null
Copy-Item -Path (Join-Path $LocalI18nDir "locales\*") -Destination .\src\renderer\src\i18n\locales -Recurse -Force

git add src\renderer\src\i18n
try {
    git commit -m "chore(i18n): add Turkish (tr-TR) translations" | Out-Null
}
catch {
    Write-Host "Commit yapılmadı: değişiklik yok veya commit hatası"
}

git push --set-upstream $Remote $branch

Write-Host "Branch pushlandı: $branch. Şimdi GitHub üzerinde PR oluşturabilirsiniz. (gh CLI yüklüyse 'gh pr create' kullanın)"
