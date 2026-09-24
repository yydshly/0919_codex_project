$ErrorActionPreference = 'Stop'
$projectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $projectDir '../..')).Path
$runtimeDir = Join-Path $repoRoot '.local/xian-design'
$pythonRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
if (!(Test-Path -LiteralPath $pythonRuntime)) { $pythonRuntime = (Get-Command python).Source }
try {
    $page = Invoke-WebRequest 'http://127.0.0.1:15214/design/2026-09-22-exploration/' -UseBasicParsing -TimeoutSec 3
    if ($page.Content -match '技术探索设计 D0') { Write-Output 'Design study is running: http://127.0.0.1:15214/design/2026-09-22-exploration/'; exit 0 }
} catch {}
$portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 15214)
try { $portProbe.Start() } catch { throw 'Port 15214 is occupied by another service.' } finally { $portProbe.Stop() }
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$process = Start-Process -FilePath $pythonRuntime -ArgumentList '-m','http.server','15214','--bind','127.0.0.1','--directory',('"' + $projectDir + '"') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
$process.Id | Set-Content (Join-Path $runtimeDir 'server.pid')
Write-Output "Design study starting (PID $($process.Id)): http://127.0.0.1:15214/design/2026-09-22-exploration/"
