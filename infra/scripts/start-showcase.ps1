$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$settings = @{}
Get-Content (Join-Path $workspace '.env') | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
  $key, $value = $_.Split('=', 2)
  $settings[$key] = $value
}

$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3308'
$env:DB_USER = 'root'
$env:DB_PASSWORD = $settings.DB_PASSWORD
$env:DB_NAME = 'wokim_showcase'
$env:PORT = '3100'
$env:PUBLIC_ORIGIN = 'http://localhost:4300'
$env:PRIVATE_STORAGE_ROOT = Join-Path $workspace 'storage\showcase\private'
$env:MODEL_CACHE_ROOT = Join-Path $workspace 'storage\showcase\models'
$env:TEMP = Join-Path $workspace 'storage\tmp\showcase'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

function Test-Port([int]$Port) {
  foreach ($hostName in @('127.0.0.1', '::1')) {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $client.Connect($hostName, $Port)
      $client.Dispose()
      return $true
    } catch {
      if ($client) { $client.Dispose() }
    }
  }
  return $false
}

if (-not (Test-Port 3308)) {
  $databaseRoot = Join-Path $workspace 'storage\showcase-mariadb'
  $databaseConfig = Join-Path $databaseRoot 'my.ini'
  if (-not (Test-Path -LiteralPath $databaseConfig)) {
    throw 'Showcase data is not initialized. Run npm run db:restore:showcase first.'
  }
  Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList @("--defaults-file=$databaseConfig") -WorkingDirectory $workspace -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 20 -and -not (Test-Port 3308); $attempt++) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-Port 3308)) { throw 'Showcase MariaDB did not start on port 3308.' }
}

if (-not (Test-Port 3100)) {
  Write-Output 'Starting showcase API at http://127.0.0.1:3100'
  Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','start:dev','--workspace','apps/api') -WorkingDirectory $workspace -WindowStyle Hidden
} else { Write-Output 'Showcase API is already running on port 3100.' }

$workerPidPath = Join-Path $workspace 'storage\tmp\showcase-worker.pid'
$workerRunning = $false
if (Test-Path -LiteralPath $workerPidPath) {
  $workerPid = [int](Get-Content -LiteralPath $workerPidPath -Raw)
  $workerProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$workerPid" -ErrorAction SilentlyContinue
  $workerRunning = $workerProcess -and $workerProcess.CommandLine -like '*start:worker*'
}
if (-not $workerRunning) {
  Write-Output 'Starting showcase processing worker.'
  $workerLog = Join-Path $workspace 'storage\tmp\showcase-worker.log'
  $workerErrorLog = Join-Path $workspace 'storage\tmp\showcase-worker.error.log'
  $worker = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','start:worker','--workspace','@wokim/api') -WorkingDirectory $workspace -WindowStyle Hidden -RedirectStandardOutput $workerLog -RedirectStandardError $workerErrorLog -PassThru
  Set-Content -LiteralPath $workerPidPath -Value $worker.Id
} else { Write-Output 'Showcase processing worker is already running.' }

if (-not (Test-Port 4300)) {
  Write-Output 'Starting showcase web app at http://localhost:4300'
  Start-Process -FilePath 'npx.cmd' -ArgumentList @('ng','serve','--port','4300','--proxy-config','proxy.showcase.conf.json') -WorkingDirectory (Join-Path $workspace 'apps\web') -WindowStyle Hidden
} else { Write-Output 'Showcase web app is already running on port 4300.' }
