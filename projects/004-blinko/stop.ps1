$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$localDir = Join-Path $workspace '.local/blinko'
$bun = Join-Path $localDir 'runtime/package/bin/bun.exe'
$pidFile = Join-Path $localDir 'server.pid'

if (Test-Path -LiteralPath $pidFile) {
    $serverProcessId = [int](Get-Content -LiteralPath $pidFile -Raw).Trim()
    $server = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId" -ErrorAction SilentlyContinue
    if ($server) {
        if ($server.ExecutablePath -ne $bun -or $server.CommandLine -notlike '*index.ts*') {
            throw 'The saved process ID belongs to another application; it was not stopped.'
        }
        Stop-Process -Id $serverProcessId
    }
    Remove-Item -LiteralPath $pidFile
}

$databaseDir = Join-Path $localDir 'postgres-data'
if (Test-Path -LiteralPath $databaseDir) {
    & pg_ctl -D $databaseDir status *> $null
    if ($LASTEXITCODE -eq 0) {
        & pg_ctl -D $databaseDir -m fast -w stop
        if ($LASTEXITCODE -ne 0) { throw 'Could not stop the Blinko database.' }
    }
}
Write-Output 'Blinko stopped. Notes and configuration are preserved.'
