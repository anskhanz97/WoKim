param(
  [int]$Port = 3307,
  [string]$XamppRoot = 'C:\xampp'
)

$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$dataDirectory = Join-Path $workspace 'storage\mariadb'
$tempDirectory = Join-Path $workspace 'storage\tmp\mariadb'
$configuration = Join-Path $dataDirectory 'my.ini'
$server = Join-Path $XamppRoot 'mysql\bin\mysqld.exe'
function Test-DatabasePort {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $client.Connect('127.0.0.1', $Port)
    $client.Dispose()
    return $true
  } catch { return $false }
}

if (-not (Test-Path -LiteralPath $configuration)) {
  throw "The D-drive MariaDB data directory is not initialized: $dataDirectory"
}
New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null

if (Test-DatabasePort) {
  Write-Output "WoKim MariaDB is already running on port $Port."
  exit 0
}

$log = Join-Path $workspace 'storage\mariadb-3307.err'
Start-Process -FilePath $server -ArgumentList @(
  "--defaults-file=`"$configuration`"",
  "--datadir=`"$dataDirectory`"",
  "--tmpdir=`"$tempDirectory`"",
  "--port=$Port",
  '--bind-address=127.0.0.1',
  "--log-error=`"$log`""
) -WindowStyle Hidden

$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  if (Test-DatabasePort) { $ready = $true; break }
}
if (-not $ready) { throw "MariaDB did not become ready. Check $log" }
Write-Output "WoKim MariaDB is running from $dataDirectory on port $Port."
