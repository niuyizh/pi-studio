$ErrorActionPreference = "SilentlyContinue"

$root = $PSScriptRoot
$infoFile = Join-Path $root "data\server.json"
$stopped = 0

# 1) 优先用实例文件里的 PID 精确停止
if (Test-Path $infoFile) {
  try {
    $info = Get-Content $infoFile -Raw | ConvertFrom-Json
    if ($info.pid) {
      $p = Get-Process -Id $info.pid -ErrorAction SilentlyContinue
      if ($p) {
        Stop-Process -Id $info.pid -Force
        Write-Host ("Stopped Pi Studio (pid " + $info.pid + ", port " + $info.port + ")")
        $stopped++
      }
    }
  } catch {}
  Remove-Item $infoFile -Force
}

# 2) 兜底：按命令行扫一遍（只匹配本目录下的 server.mjs，避免误杀其他 node 服务）
$cim = Get-CimInstance Win32_Process -Filter "Name='node.exe'"
foreach ($p in @($cim)) {
  $c = $p.CommandLine
  if (-not $c) { continue }
  if ($c -like "*pi-coding-agent*") { continue }
  if (($c -like "*server.mjs*") -and ($c -like "*$root*")) {
    Stop-Process -Id $p.ProcessId -Force
    Write-Host ("Stopped leftover Pi Studio (pid " + $p.ProcessId + ")")
    $stopped++
  }
}

# 3) 清掉它启动的 pi 子进程
foreach ($p in @(Get-CimInstance Win32_Process -Filter "Name='node.exe'")) {
  if ($p.CommandLine -like "*pi-coding-agent*" -and $p.CommandLine -like "*--mode rpc*") {
    Stop-Process -Id $p.ProcessId -Force
  }
}

if ($stopped -eq 0) { Write-Host "Pi Studio is not running." }
Start-Sleep -Milliseconds 500
Write-Host "Done."
