param(
  [string]$Distribution = 'D:\Code\5. Projects\WoKim\storage\tooling\mysql-8.4.13-winx64',
  [string]$DataRoot = 'D:\Code\5. Projects\WoKim\storage\mysql84',
  [int]$Port = 3308
)

$ErrorActionPreference = 'Stop'

foreach ($path in @($Distribution, $DataRoot)) {
  if ([System.IO.Path]::GetPathRoot([System.IO.Path]::GetFullPath($path)) -ne 'D:\') {
    throw 'MySQL distribution and data roots must be on D:.'
  }
}

$mysqld = Join-Path $Distribution 'bin\mysqld.exe'
$mysql = Join-Path $Distribution 'bin\mysql.exe'
$mysqladmin = Join-Path $Distribution 'bin\mysqladmin.exe'
if (-not (Test-Path -LiteralPath $mysqld)) { throw "MySQL server binary is missing: $mysqld" }

$tempRoot = Join-Path $DataRoot 'tmp'
$secureRoot = Join-Path $DataRoot 'secure-file'
$logRoot = Join-Path $DataRoot 'logs'
New-Item -ItemType Directory -Path $DataRoot, $tempRoot, $secureRoot, $logRoot -Force | Out-Null

$slash = { param([string]$Value) [System.IO.Path]::GetFullPath($Value).Replace('\', '/') }
$config = Join-Path $DataRoot 'my.ini'
$configBody = @"
[mysqld]
basedir=$(& $slash $Distribution)
datadir=$(& $slash (Join-Path $DataRoot 'data'))
tmpdir=$(& $slash $tempRoot)
secure-file-priv=$(& $slash $secureRoot)
log-error=$(& $slash (Join-Path $logRoot 'mysql84.err'))
pid-file=$(& $slash (Join-Path $DataRoot 'mysql84.pid'))
port=$Port
bind-address=127.0.0.1
mysqlx=0
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
"@
$configBody | Set-Content -LiteralPath $config -Encoding ascii

$databaseFiles = Join-Path $DataRoot 'data'
if (-not (Test-Path -LiteralPath (Join-Path $databaseFiles 'mysql'))) {
  New-Item -ItemType Directory -Path $databaseFiles -Force | Out-Null
  & $mysqld "--defaults-file=$config" --initialize-insecure
  if ($LASTEXITCODE -ne 0) { throw 'MySQL 8.4 initialization failed.' }
}

$existing = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($existing) {
  $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($existing[0].OwningProcess)"
  if (-not [string]::Equals($owner.ExecutablePath, $mysqld, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Port $Port is already owned by a different process."
  }
} else {
  Start-Process -FilePath $mysqld -ArgumentList "`"--defaults-file=$config`"" -WindowStyle Hidden | Out-Null
}

$deadline = (Get-Date).AddSeconds(90)
do {
  & $mysqladmin --connect-timeout=2 --protocol=tcp --host=127.0.0.1 --port=$Port --user=root ping --silent 2>$null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)
if ($LASTEXITCODE -ne 0) { throw "MySQL 8.4 did not become ready on port $Port." }

$provisionSql = @"
CREATE DATABASE IF NOT EXISTS wokim_mysql84 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wokim'@'127.0.0.1' IDENTIFIED BY 'wokim-test-only';
ALTER USER 'wokim'@'127.0.0.1' IDENTIFIED BY 'wokim-test-only';
GRANT ALL PRIVILEGES ON wokim_mysql84.* TO 'wokim'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
& $mysql --protocol=tcp --host=127.0.0.1 --port=$Port --user=root "--execute=$provisionSql"
if ($LASTEXITCODE -ne 0) { throw 'MySQL 8.4 test database provisioning failed.' }

Write-Output "MySQL 8.4 is ready on 127.0.0.1:$Port with data under $DataRoot."
