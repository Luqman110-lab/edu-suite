$envContent = Get-Content ".env"
foreach ($line in $envContent) {
    if ($line -match "^\s*([^#]\w+)\s*=\s*(.*)\s*$") {
        $name = $matches[1]
        $value = $matches[2].Trim('"', "'")
        Set-Item -Path "Env:$name" -Value $value
    }
}
npx tsx scripts/migrate-hr-missing.ts
