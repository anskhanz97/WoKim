param([Parameter(Mandatory=$true)][string]$Archive,[string]$ScratchRoot='D:\Code\5. Projects\WoKim\storage\restore-smoke')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$settings=@{};Get-Content -LiteralPath (Join-Path $repo '.env')|ForEach-Object{if($_ -match '^([^#=]+)=(.*)$'){$settings[$matches[1].Trim()]=$matches[2].Trim()}}
$scratchRootPath=[System.IO.Path]::GetFullPath($ScratchRoot)
if([System.IO.Path]::GetPathRoot($scratchRootPath) -ne 'D:\'){throw 'Restore scratch root must be on the D: drive.'}
$scratch=[System.IO.Path]::GetFullPath((Join-Path $scratchRootPath (Get-Date -Format 'yyyyMMdd-HHmmss')))
New-Item -ItemType Directory -Path $scratch -Force|Out-Null
Expand-Archive -LiteralPath $Archive -DestinationPath $scratch
$manifestFile=Get-ChildItem -LiteralPath $scratch -Filter manifest.json -Recurse|Select-Object -First 1
if(-not $manifestFile){throw 'Backup manifest is missing.'}
$manifest=Get-Content -LiteralPath $manifestFile.FullName -Raw|ConvertFrom-Json
$dump=Join-Path $manifestFile.Directory.FullName 'database.sql'
if((Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash -ne $manifest.databaseSha256){throw 'Database checksum mismatch.'}
$private=Join-Path $manifestFile.Directory.FullName 'private'
foreach($file in $manifest.files){$path=Join-Path $private $file.path;if(-not(Test-Path -LiteralPath $path)){throw "Missing original: $($file.path)"};if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $file.sha256){throw "Original checksum mismatch: $($file.path)"}}
$database='wokim_restore_'+(Get-Date -Format 'yyyyMMddHHmmss')
if($database -notmatch '^wokim_restore_\d{14}$'){throw 'Unsafe scratch database name.'}
$env:MYSQL_PWD=$settings.DB_ROOT_PASSWORD
try{
  & 'C:\xampp\mysql\bin\mysql.exe' --protocol=tcp --host=$($settings.DB_HOST) --port=$($settings.DB_PORT) --user=root --execute="CREATE DATABASE ``$database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  if($LASTEXITCODE -ne 0){throw 'Scratch database creation failed.'}
  $source=$dump.Replace('\','/')
  & 'C:\xampp\mysql\bin\mysql.exe' --protocol=tcp --host=$($settings.DB_HOST) --port=$($settings.DB_PORT) --user=root --database=$database --execute="SOURCE $source"
  if($LASTEXITCODE -ne 0){throw 'Scratch database import failed.'}
  $count=& 'C:\xampp\mysql\bin\mysql.exe' --batch --skip-column-names --protocol=tcp --host=$($settings.DB_HOST) --port=$($settings.DB_PORT) --user=root --database=$database --execute='SELECT COUNT(*) FROM migrations;'
  if([int]$count -lt 1){throw 'Restored schema has no migrations.'}
  Write-Output "Restore verified in isolated database $database with $($manifest.files.Count) file checksum(s)."
}finally{
  & 'C:\xampp\mysql\bin\mysql.exe' --protocol=tcp --host=$($settings.DB_HOST) --port=$($settings.DB_PORT) --user=root --execute="DROP DATABASE IF EXISTS ``$database``;" | Out-Null
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
