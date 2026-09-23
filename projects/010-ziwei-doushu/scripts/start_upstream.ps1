param([int]$Port = 3010)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$upstreamPath = Join-Path $workspaceRoot '.local/ziwei-doushu-upstream'
if (-not (Test-Path -LiteralPath (Join-Path $upstreamPath 'node_modules/next/dist/bin/next'))) {
    throw 'Upstream dependencies are missing. Follow the installation steps in this project README first.'
}
$previousTelemetry = $env:NEXT_TELEMETRY_DISABLED
Push-Location -LiteralPath $upstreamPath
try {
    $env:NEXT_TELEMETRY_DISABLED = '1'
    & node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port $Port
} finally {
    Pop-Location
    $env:NEXT_TELEMETRY_DISABLED = $previousTelemetry
}
