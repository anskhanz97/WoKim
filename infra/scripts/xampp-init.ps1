param(
  [Parameter(Mandatory = $true)][string]$AppPassword,
  [string]$RootPassword = "",
  [string]$MysqlPath = "C:\xampp\mysql\bin\mysql.exe"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $MysqlPath)) {
  throw "MySQL client not found at $MysqlPath. Pass -MysqlPath if XAMPP is installed elsewhere."
}
if ($AppPassword.Length -lt 12) {
  throw "Use an application database password with at least 12 characters."
}

$escapedPassword = $AppPassword.Replace("'", "''")
$sql = @"
CREATE DATABASE IF NOT EXISTS wokim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wokim'@'localhost' IDENTIFIED BY '$escapedPassword';
ALTER USER 'wokim'@'localhost' IDENTIFIED BY '$escapedPassword';
GRANT ALL PRIVILEGES ON wokim.* TO 'wokim'@'localhost';
CREATE USER IF NOT EXISTS 'wokim'@'127.0.0.1' IDENTIFIED BY '$escapedPassword';
ALTER USER 'wokim'@'127.0.0.1' IDENTIFIED BY '$escapedPassword';
GRANT ALL PRIVILEGES ON wokim.* TO 'wokim'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

$previousPassword = $env:MYSQL_PWD
try {
  $env:MYSQL_PWD = $RootPassword
  $sql | & $MysqlPath --user=root --host=127.0.0.1 --protocol=tcp
  if ($LASTEXITCODE -ne 0) { throw "XAMPP database initialization failed." }
} finally {
  $env:MYSQL_PWD = $previousPassword
}

Write-Output "Created the local wokim database and least-scope application user. Put the same application password in .env."
