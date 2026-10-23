param([string]$Destination = 'D:\Code\5. Projects\WoKim\storage\backups')
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$statusPath = Join-Path $repo 'storage\backup-status.json'
$statusTemp = "$statusPath.part"
trap {
  $previous = if (Test-Path -LiteralPath $statusPath) { Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json } else { $null }
  @{
    schemaVersion = 1
    lastSuccessfulAt = $previous.lastSuccessfulAt
    archive = $previous.archive
    databaseSha256 = $previous.databaseSha256
    fileCount = $previous.fileCount
    lastFailureAt = (Get-Date).ToUniversalTime().ToString('o')
    lastFailure = $_.Exception.Message
  } | ConvertTo-Json | Set-Content -LiteralPath $statusTemp -Encoding utf8
  Move-Item -LiteralPath $statusTemp -Destination $statusPath -Force
  throw $_
}
$settings = @{}
Get-Content -LiteralPath (Join-Path $repo '.env') | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $settings[$matches[1].Trim()] = $matches[2].Trim() }
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$destinationRoot = [System.IO.Path]::GetFullPath($Destination)
if ([System.IO.Path]::GetPathRoot($destinationRoot) -ne 'D:\') { throw 'Backup destination must be on the D: drive.' }
$target = Join-Path $destinationRoot "wokim-$stamp"
New-Item -ItemType Directory -Path $target -Force | Out-Null
$dump = Join-Path $target 'database.sql'
try {
  $env:MYSQL_PWD = $settings.DB_ROOT_PASSWORD
  & 'C:\xampp\mysql\bin\mysqldump.exe' --protocol=tcp --host=$($settings.DB_HOST) --port=$($settings.DB_PORT) --user=root --single-transaction --routines --result-file=$dump $settings.DB_NAME
  if ($LASTEXITCODE -ne 0) { throw 'mysqldump failed.' }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
$privateRoot = [System.IO.Path]::GetFullPath($settings.PRIVATE_STORAGE_ROOT)
if ([System.IO.Path]::GetPathRoot($privateRoot) -ne 'D:\') { throw 'Private storage must be on the D: drive.' }
$privateTarget = Join-Path $target 'private'
New-Item -ItemType Directory -Path $privateTarget -Force | Out-Null
Get-ChildItem -LiteralPath $privateRoot -Force | Copy-Item -Destination $privateTarget -Recurse -Force
$privatePrefix = $privateRoot.TrimEnd('\') + '\'
$files = Get-ChildItem -LiteralPath $privateRoot -File -Recurse | ForEach-Object {
  @{ path = $_.FullName.Substring($privatePrefix.Length).Replace('\','/'); sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash; bytes = $_.Length }
}
$manifest = @{ schemaVersion = 1; createdAt = (Get-Date).ToUniversalTime().ToString('o'); databaseSha256 = (Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash; files = @($files) }
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $target 'manifest.json') -Encoding utf8
$archive = "$target.zip"
Compress-Archive -LiteralPath $target -DestinationPath $archive
Remove-Item -LiteralPath $target -Recurse -Force
@{
  schemaVersion = 1
  lastSuccessfulAt = (Get-Date).ToUniversalTime().ToString('o')
  archive = $archive
  databaseSha256 = $manifest.databaseSha256
  fileCount = @($files).Count
  lastFailureAt = $null
  lastFailure = $null
} | ConvertTo-Json | Set-Content -LiteralPath $statusTemp -Encoding utf8
Move-Item -LiteralPath $statusTemp -Destination $statusPath -Force
Write-Output $archive
