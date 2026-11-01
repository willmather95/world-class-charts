// node serve.mjs [port] : serves dist/ over http for the Playwright tests (file:// breaks ES modules).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
createServer(async (req, res) => {
  const p = join("dist", (req.url ?? "/").split("?")[0].replace(/\/$/, "/index.html"));
  try { const body = await readFile(p); res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(Number(process.argv[2] ?? 4179));
