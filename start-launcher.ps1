$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolsDir = Join-Path $projectRoot '.codex-tools'
$nodeDir = Join-Path $toolsDir 'node-v22.22.2-win-x64'
$npmCmd = Join-Path $nodeDir 'npm.cmd'

if (-not (Test-Path -LiteralPath $npmCmd)) {
    Write-Error "Nie znaleziono pliku npm.cmd w: $npmCmd"
}

Set-Location -LiteralPath $projectRoot
$env:PATH = "$nodeDir;$env:PATH"

& $npmCmd run start
