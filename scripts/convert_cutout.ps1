Add-Type -AssemblyName System.Drawing
$inPath = (Resolve-Path "public/assets/presenter_advisor.jpg").Path
$outPath = [System.IO.Path]::Combine((Split-Path $inPath), "presenter_advisor.png")

$img = [System.Drawing.Bitmap]::FromFile($inPath)
$w = $img.Width
$h = $img.Height
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)

$srcData = $img.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$out = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = $w * $h * 4
$buffer = New-Object byte[] $bytes
[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $buffer, 0, $bytes)

# Process pixel buffer at native speed
for ($i = 0; $i -lt $bytes; $i += 4) {
    $b = $buffer[$i]
    $g = $buffer[$i + 1]
    $r = $buffer[$i + 2]
    
    if ($r -gt 240 -and $g -gt 240 -and $b -gt 240) {
        $buffer[$i + 3] = 0
    } elseif ($r -gt 225 -and $g -gt 225 -and $b -gt 225) {
        $avg = ($r + $g + $b) / 3.0
        $alpha = [byte]([Math]::Max(0, [Math]::Min(255, (255.0 - $avg) * 12.0)))
        $buffer[$i + 3] = $alpha
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($buffer, 0, $dstData.Scan0, $bytes)
$img.UnlockBits($srcData)
$out.UnlockBits($dstData)

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$out.Dispose()
Write-Host "Transparent PNG saved successfully to: $outPath"

