# Configura los secretos en Fly.io desde .env local
# Uso: .\scripts\fly-secrets.ps1 [-App albion-guild-bot]
# Requiere: .env en la raíz del proyecto

param([string]$App = "albion-guild-bot")

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "No se encontró .env. Cópialo desde .env.example y complétalo." -ForegroundColor Red
    exit 1
}

Write-Host "Configurando secretos para app: $App`n" -ForegroundColor Cyan

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $Matches[1].Trim()
        $val = $Matches[2].Trim().Trim('"')
        if ($key -and $val) {
            $vars = @("DISCORD_TOKEN","GUILD_ID","PANEL_CHANNEL_ID","ADMIN_USER_IDS","LEADER_ROLE_IDS",
                     "EVENTS_CHANNEL_ID","EVENTS_CHANNEL_LOOT_ID","EVENTS_ANNOUNCE_ROLE_ID","FUND_PERCENTAGE_DEFAULT")
            if ($vars -contains $key) {
                Write-Host "  $key" -ForegroundColor Gray
                & flyctl secrets set "$key=$val" --app $App 2>$null
            }
        }
    }
}

Write-Host "`nSecrets configurados. Ejecuta: flyctl deploy --app $App" -ForegroundColor Green
