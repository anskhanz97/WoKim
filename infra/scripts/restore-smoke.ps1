param(
  [Parameter(Mandatory = $true)][string]$Archive,
  [Parameter(Mandatory = $true)][string]$ScratchDirectory
)

$ErrorActionPreference = "Stop"
$resolvedScratch = [System.IO.Path]::GetFullPath($ScratchDirectory)
New-Item -ItemType Directory -Path $resolvedScratch -Force | Out-Null
Expand-Archive -LiteralPath $Archive -DestinationPath $resolvedScratch
$manifest = Get-ChildItem -LiteralPath $resolvedScratch -Filter manifest.json -Recurse | Select-Object -First 1
if (-not $manifest) { throw "Backup manifest is missing." }
$data = Get-Content -LiteralPath $manifest.FullName -Raw | ConvertFrom-Json
$sql = Join-Path $manifest.Directory.FullName "database.sql"
$actual = (Get-FileHash -LiteralPath $sql -Algorithm SHA256).Hash
if ($actual -ne $data.databaseSha256) { throw "Database checksum does not match the manifest." }
Write-Output "Archive and database checksum verified. A full restore still requires an isolated MySQL instance and application smoke test."
