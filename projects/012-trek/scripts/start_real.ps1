# Start an already-built upstream checkout. Never expose this demo to the LAN.
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$upstreamRoot = Join-Path $repoRoot '.local/trek-extracted/TREK-b98787f83698f3beee1b9a8475121c52f0caf07c'
$serverRoot = Join-Path $upstreamRoot 'server'
$nodeRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (!(Test-Path $nodeRuntime)) { $nodeRuntime = (Get-Command node).Source }
if (!(Test-Path (Join-Path $serverRoot 'dist/index.js'))) { throw 'Build the fixed upstream checkout first; see README.' }
if (!(Test-Path (Join-Path $serverRoot '.env'))) { throw 'Missing local .env. See README for loopback configuration.' }
try { $health = Invoke-RestMethod 'http://127.0.0.1:3212/api/health' -TimeoutSec 2; Write-Output 'TREK is already running at http://127.0.0.1:3212'; exit 0 } catch {}
$env:HOST = '127.0.0.1'
$env:PORT = '3212'
$env:COOKIE_SECURE = 'false'
$env:FORCE_HTTPS = 'false'
$runtimeDir = Join-Path $repoRoot '.local/trek-runtime'
New-Item -ItemType Directory -Force $runtimeDir | Out-Null
$process = Start-Process -FilePath $nodeRuntime -ArgumentList '--require','tsconfig-paths/register','dist/index.js' -WorkingDirectory $serverRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
$process.Id | Set-Content (Join-Path $runtimeDir 'server.pid')
Write-Output "TREK starting (PID $($process.Id)). First start may take about 90 seconds. Open http://127.0.0.1:3212"
