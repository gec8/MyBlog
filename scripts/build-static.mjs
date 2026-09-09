import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputDir = resolve("dist/client");
rmSync(resolve("dist"), { recursive: true, force: true });

const cli = resolve("node_modules/vinext/dist/cli.js");
const result = spawnSync(process.execPath, [cli, "build"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

const chunksDir = resolve(outputDir, "_next/static/chunks");
const validExport =
  existsSync(resolve(outputDir, "index.html")) &&
  existsSync(resolve(outputDir, "og.png")) &&
  existsSync(chunksDir) &&
  readdirSync(chunksDir).some((file) => file.endsWith(".js"));

if (!validExport) process.exit(result.status ?? 1);

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
if (basePath) {
  const rewrite = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) rewrite(file);
      else if (/\.(?:html|rsc|js|json|css)$/.test(entry.name)) {
        const source = readFileSync(file, "utf8");
        const next = source
          .replaceAll('"/_next/', `"${basePath}/_next/`)
          .replaceAll("'/_next/", `'${basePath}/_next/`)
          .replaceAll('"/favicon.svg"', `"${basePath}/favicon.svg"`);
        if (next !== source) writeFileSync(file, next);
      }
    }
  };
  rewrite(outputDir);
}

if (result.status && process.platform === "win32") {
  console.warn("Static export verified; ignoring Vinext's Windows libuv shutdown warning.");
}
process.exit(0);
