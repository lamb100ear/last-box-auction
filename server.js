import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const root = path.dirname(fileURLToPath(import.meta.url));
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav"
};

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent((request.url || "/").split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(path.join(root, requestPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": contentTypes[extension] || "application/octet-stream"
    };
    // 本地开发时脚本和样式每次重新取，避免改了代码浏览器还在跑旧模块。
    if ([".html", ".js", ".css"].includes(extension)) {
      headers["Cache-Control"] = "no-store";
    }
    response.writeHead(200, headers);
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`《再拍最后一箱！》运行中：http://${host}:${port}`);
});
