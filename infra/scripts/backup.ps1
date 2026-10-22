param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$ComposeFile = "infra/compose.yml"
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path (Resolve-Path -LiteralPath (New-Item -ItemType Directory -Path $Destination -Force)).Path "wokim-$stamp"
New-Item -ItemType Directory -Path $target | Out-Null

docker compose -f $ComposeFile exec -T db sh -c 'mysqldump --single-transaction -u root -p"$MYSQL_ROOT_PASSWORD" wokim' | Set-Content -LiteralPath (Join-Path $target "database.sql") -Encoding utf8
docker compose -f $ComposeFile cp api:/data/private (Join-Path $target "private")

$manifest = @{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  appVersion = (git rev-parse HEAD 2>$null)
  databaseSha256 = (Get-FileHash -LiteralPath (Join-Path $target "database.sql") -Algorithm SHA256).Hash
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target "manifest.json") -Encoding utf8
Compress-Archive -LiteralPath $target -DestinationPath "$target.zip"
Write-Output "Backup created at $target.zip. Encrypt and copy it off this server before treating it as complete."
