$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$localDir = Join-Path $workspace '.local/blinko'
$upstream = Join-Path $localDir 'upstream'
$bun = Join-Path $localDir 'runtime/package/bin/bun.exe'
$databaseDir = Join-Path $localDir 'postgres-data'
$pgCtl = (Get-Command pg_ctl -ErrorAction Stop).Source

if (!(Test-Path -LiteralPath $bun) -or !(Test-Path -LiteralPath (Join-Path $upstream '.env'))) {
    throw 'Local runtime is missing. Follow README.md to install this project first.'
}

& $pgCtl -D $databaseDir status *> $null
if ($LASTEXITCODE -ne 0) {
    & $pgCtl -D $databaseDir -l (Join-Path $localDir 'postgres.log') -o '-p 5544 -h 127.0.0.1' -w start
    if ($LASTEXITCODE -ne 0) { throw 'Could not start the Blinko database.' }
}

$listener = Get-NetTCPConnection -LocalPort 1111 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if ($existing.ExecutablePath -ne $bun) { throw 'Port 1111 is already used by another application.' }
    Write-Output 'Blinko is already running: http://127.0.0.1:1111'
    return
}

$env:PATH = (Split-Path $bun) + ';' + $env:PATH
$filesDir = Join-Path $upstream 'server/.blinko/files'
New-Item -ItemType Directory -Force $filesDir | Out-Null
# Upstream seed paths assume the repository root; this launcher runs in server/.
Get-ChildItem -LiteralPath (Join-Path $upstream 'prisma/seedfiles') -File | ForEach-Object {
    $destination = Join-Path $filesDir $_.Name
    if (!(Test-Path -LiteralPath $destination)) {
        Copy-Item -LiteralPath $_.FullName -Destination $destination
    }
}
$server = Start-Process -FilePath $bun -ArgumentList @('--env-file', '../.env', 'index.ts') `
    -WorkingDirectory (Join-Path $upstream 'server') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $localDir 'server.stdout.log') `
    -RedirectStandardError (Join-Path $localDir 'server.stderr.log')
$server.Id | Set-Content -LiteralPath (Join-Path $localDir 'server.pid')

for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $server.Refresh()
    if ($server.HasExited) { throw 'Blinko exited. Check .local/blinko/server.stderr.log.' }
    try {
        $response = Invoke-WebRequest 'http://127.0.0.1:1111/api/v1/public/server-version' -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Output 'Blinko is running: http://127.0.0.1:1111'
            return
        }
    } catch { }
    Start-Sleep -Seconds 1
}
throw 'Startup has not completed. Check .local/blinko/server.stderr.log.'
