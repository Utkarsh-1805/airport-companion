param(
  [string]$Root = ".",
  [int]$Port = 5173
)

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Serving $resolvedRoot at http://localhost:$Port"

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) {
      continue
    }

    while ($reader.Peek() -gt -1) {
      $line = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($line)) {
        break
      }
    }

    $parts = $requestLine.Split(" ")
    $urlPath = [System.Uri]::UnescapeDataString($parts[1].Split("?")[0])
    if ($urlPath -eq "/") {
      $urlPath = "/index.html"
    }

    $relativePath = $urlPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($resolvedRoot, $relativePath))

    if (-not $filePath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
      $header = "HTTP/1.1 403 Forbidden`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Write($body, 0, $body.Length)
      continue
    }

    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Write($body, 0, $body.Length)
      continue
    }

    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
    $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
    $responseHeader = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($responseHeader)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
  } finally {
    $client.Close()
  }
}
