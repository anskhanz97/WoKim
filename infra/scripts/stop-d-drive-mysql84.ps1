param(
  [string]$Distribution = 'D:\Code\5. Projects\WoKim\storage\tooling\mysql-8.4.13-winx64',
  [int]$Port = 3308
)

$ErrorActionPreference = 'Stop'
if ([System.IO.Path]::GetPathRoot([System.IO.Path]::GetFullPath($Distribution)) -ne 'D:\') {
  throw 'MySQL distribution root must be on D:.'
}
$mysqladmin = Join-Path $Distribution 'bin\mysqladmin.exe'
if (-not (Test-Path -LiteralPath $mysqladmin)) { throw "MySQL admin binary is missing: $mysqladmin" }
& $mysqladmin --connect-timeout=5 --protocol=tcp --host=127.0.0.1 --port=$Port --user=root shutdown
if ($LASTEXITCODE -ne 0) { throw 'MySQL 8.4 shutdown failed.' }
Write-Output "MySQL 8.4 on port $Port stopped."
