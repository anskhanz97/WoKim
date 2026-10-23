param(
  [int]$Port = 3308,
  [string]$XamppRoot = 'C:\xampp'
)

$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([System.IO.Path]::GetPathRoot($workspace) -ne 'D:\') {
  throw 'The WoKim showcase must run from the D: drive.'
}

$settings = @{}
Get-Content -LiteralPath (Join-Path $workspace '.env') | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $settings[$matches[1].Trim()] = $matches[2].Trim() }
}
if (-not $settings.DB_PASSWORD) { throw 'DB_PASSWORD is missing from .env.' }

$fixtureRoot = Join-Path $workspace 'fixtures\showcase'
$manifest = Get-Content -LiteralPath (Join-Path $fixtureRoot 'manifest.json') -Raw | ConvertFrom-Json
$dump = Join-Path $fixtureRoot 'database.sql'
if ((Get-FileHash -LiteralPath $dump -Algorithm SHA256).Hash -ne $manifest.databaseSha256) {
  throw 'Showcase database checksum mismatch.'
}
foreach ($file in $manifest.files) {
  $path = Join-Path $fixtureRoot $file.path
  if (-not (Test-Path -LiteralPath $path)) { throw "Missing showcase file: $($file.path)" }
  if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $file.sha256) {
    throw "Showcase file checksum mismatch: $($file.path)"
  }
}

$databaseRoot = Join-Path $workspace 'storage\showcase-mariadb'
$databaseTemp = Join-Path $workspace 'storage\tmp\showcase-mariadb'
$configuration = Join-Path $databaseRoot 'my.ini'
$server = Join-Path $XamppRoot 'mysql\bin\mysqld.exe'
$installer = Join-Path $XamppRoot 'mysql\bin\mysql_install_db.exe'
$client = Join-Path $XamppRoot 'mysql\bin\mysql.exe'

function Test-DatabasePort {
  try {
    $socket = [System.Net.Sockets.TcpClient]::new()
    $socket.Connect('127.0.0.1', $Port)
    $socket.Dispose()
    return $true
  } catch { return $false }
}

New-Item -ItemType Directory -Force -Path $databaseRoot, $databaseTemp | Out-Null
if (-not (Test-Path -LiteralPath $configuration)) {
  & $installer "--datadir=$databaseRoot" "--password=$($settings.DB_PASSWORD)" "--port=$Port" '--allow-remote-root-access'
  if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the D-drive showcase database.' }
  @"
[mysqld]
datadir=$($databaseRoot.Replace('\', '/'))
tmpdir=$($databaseTemp.Replace('\', '/'))
port=$Port
bind-address=127.0.0.1
[client]
port=$Port
"@ | Set-Content -LiteralPath $configuration -Encoding utf8
}

if (-not (Test-DatabasePort)) {
  $log = Join-Path $workspace 'storage\showcase-mariadb.err'
  Start-Process -FilePath $server -ArgumentList @(
    "--defaults-file=`"$configuration`"",
    "--datadir=`"$databaseRoot`"",
    "--tmpdir=`"$databaseTemp`"",
    "--port=$Port",
    '--bind-address=127.0.0.1',
    "--log-error=`"$log`""
  ) -WorkingDirectory $workspace -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 40 -and -not (Test-DatabasePort); $attempt++) {
    Start-Sleep -Milliseconds 500
  }
  if (-not (Test-DatabasePort)) { throw "Showcase MariaDB did not start. Check $log" }
}

$env:MYSQL_PWD = $settings.DB_PASSWORD
try {
  & $client --protocol=tcp --host=127.0.0.1 --port=$Port --user=root --execute='DROP DATABASE IF EXISTS `wokim_showcase`; CREATE DATABASE `wokim_showcase` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
  if ($LASTEXITCODE -ne 0) { throw 'Could not recreate the showcase database.' }
  $import = Start-Process -FilePath $client -ArgumentList @(
    '--binary-mode=1', '--protocol=tcp', '--host=127.0.0.1', "--port=$Port",
    '--user=root', '--database=wokim_showcase'
  ) -RedirectStandardInput $dump -NoNewWindow -Wait -PassThru
  if ($import.ExitCode -ne 0) { throw 'Could not import the showcase database snapshot.' }

  $counts = & $client --batch --skip-column-names --protocol=tcp --host=127.0.0.1 --port=$Port --user=root --database=wokim_showcase --execute="SELECT CONCAT((SELECT COUNT(*) FROM projects), ',', (SELECT COUNT(*) FROM tasks), ',', (SELECT COUNT(*) FROM entries), ',', (SELECT COUNT(*) FROM attachments), ',', (SELECT COUNT(*) FROM sessions));"
  if ($LASTEXITCODE -ne 0 -or $counts -ne '5,7,7,3,0') { throw "Unexpected restored row counts: $counts" }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

$privateRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace 'storage\showcase\private'))
$expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace 'storage\showcase'))
if (-not $privateRoot.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Refusing to replace showcase files outside the expected D-drive storage directory.'
}
if (Test-Path -LiteralPath $privateRoot) { Remove-Item -LiteralPath $privateRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Split-Path $privateRoot) | Out-Null
Copy-Item -LiteralPath (Join-Path $fixtureRoot 'private') -Destination $privateRoot -Recurse

Write-Output "Showcase restored on port $Port with 5 projects, 7 tasks, 7 entries, and 3 attachments."
Write-Output 'Login: showcase@wokim.local / WokimShowcase2026!'
