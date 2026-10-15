param(
  [string[]]$Paths = @(
    "美术/物品/by-id"
  ),
  [int]$Tolerance = 38
)

Add-Type -AssemblyName System.Drawing

if (-not ("TransparentBackgroundProcessor" -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class TransparentBackgroundProcessor
{
    public static int Process(string path, int tolerance)
    {
        var source = new Bitmap(path);
        using (var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.DrawImage(source, 0, 0, source.Width, source.Height);
            }
            source.Dispose();

            int width = bitmap.Width;
            int height = bitmap.Height;
            var rect = new Rectangle(0, 0, width, height);
            var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int stride = data.Stride;
            int byteCount = stride * height;
            var bytes = new byte[byteCount];
            Marshal.Copy(data.Scan0, bytes, 0, byteCount);

            int[] cornerX = { 0, width - 1, 0, width - 1 };
            int[] cornerY = { 0, 0, height - 1, height - 1 };
            long sumR = 0, sumG = 0, sumB = 0;
            int count = 0;
            for (int index = 0; index < cornerX.Length; index++)
            {
                int offset = cornerY[index] * stride + cornerX[index] * 4;
                if (bytes[offset + 3] == 0) continue;
                sumB += bytes[offset];
                sumG += bytes[offset + 1];
                sumR += bytes[offset + 2];
                count++;
            }
            if (count == 0)
            {
                bitmap.UnlockBits(data);
                return 0;
            }

            int refR = (int)(sumR / count);
            int refG = (int)(sumG / count);
            int refB = (int)(sumB / count);
            double maxDistanceSquared = tolerance * tolerance;
            var visited = new bool[width * height];
            var queue = new Queue<int>(width * 2 + height * 2);

            for (int x = 0; x < width; x++)
            {
                queue.Enqueue(x);
                queue.Enqueue((height - 1) * width + x);
            }
            for (int y = 1; y < height - 1; y++)
            {
                queue.Enqueue(y * width);
                queue.Enqueue(y * width + width - 1);
            }

            bool changed = false;
            while (queue.Count > 0)
            {
                int pixel = queue.Dequeue();
                if (visited[pixel]) continue;
                visited[pixel] = true;
                int x = pixel % width;
                int y = pixel / width;
                int offset = y * stride + x * 4;
                if (bytes[offset + 3] == 0) continue;

                int b = bytes[offset];
                int g = bytes[offset + 1];
                int r = bytes[offset + 2];
                double dr = r - refR;
                double dg = g - refG;
                double db = b - refB;
                if (dr * dr + dg * dg + db * db > maxDistanceSquared) continue;

                bytes[offset + 3] = 0;
                changed = true;
                if (x > 0) queue.Enqueue(pixel - 1);
                if (x < width - 1) queue.Enqueue(pixel + 1);
                if (y > 0) queue.Enqueue(pixel - width);
                if (y < height - 1) queue.Enqueue(pixel + width);
            }

            Marshal.Copy(bytes, 0, data.Scan0, byteCount);
            bitmap.UnlockBits(data);

            if (!changed) return 0;
            string tempPath = path + ".transparent.png";
            bitmap.Save(tempPath, ImageFormat.Png);
            bitmap.Dispose();
            File.Delete(path);
            File.Move(tempPath, path);
            return 1;
        }
    }
}
"@
}

$files = @()
foreach ($path in $Paths) {
  if (Test-Path -LiteralPath $path -PathType Container) {
    $files += Get-ChildItem -LiteralPath $path -Filter *.png
  } elseif (Test-Path -LiteralPath $path -PathType Leaf) {
    $files += Get-Item -LiteralPath $path
  }
}

$files = $files |
  Where-Object { $_.Name -notlike "_miora*" } |
  Sort-Object FullName -Unique

foreach ($file in $files) {
  $method = [TransparentBackgroundProcessor].GetMethod("Process")
  $changed = [int]$method.Invoke(
    $null,
    @([string]$file.FullName, [int]$Tolerance)
  )
  if ($changed) {
    Write-Output "透明化：$($file.FullName)"
  }
}
