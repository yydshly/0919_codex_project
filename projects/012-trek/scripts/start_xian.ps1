# Start the custom Xi'an product, backed by the original local TREK instance.
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$runtimeDir = Join-Path $repoRoot '.local/xian-demo'
$serverScript = Join-Path $PSScriptRoot 'xian_server.py'
$pythonRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
if (!(Test-Path -LiteralPath $pythonRuntime)) { $pythonRuntime = (Get-Command python).Source }
try {
    $health = Invoke-RestMethod 'http://127.0.0.1:5213/api/health' -TimeoutSec 3
    if ($health.ok) { Write-Output 'Xi''an demo is running at http://127.0.0.1:5213'; exit 0 }
} catch {}
& (Join-Path $PSScriptRoot 'start_real.ps1')
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$process = Start-Process -FilePath $pythonRuntime -ArgumentList '-u', ('"' + $serverScript + '"') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
$process.Id | Set-Content (Join-Path $runtimeDir 'server.pid')
Write-Output "Xi'an demo starting (PID $($process.Id)). Open http://127.0.0.1:5213"
