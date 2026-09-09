import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputDir = resolve("dist/client");
const packageInfo = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
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

// Vinext can keep the same CSS asset name even when its contents change.
// Add a content hash so GitHub Pages' immutable cache always serves fresh styles.
const cssDir = resolve(outputDir, "_next/static/css");
if (existsSync(cssDir)) {
  for (const fileName of readdirSync(cssDir).filter((file) => file.endsWith(".css"))) {
    const oldPath = resolve(cssDir, fileName);
    const hash = createHash("sha256").update(readFileSync(oldPath)).digest("hex").slice(0, 10);
    const nextName = fileName.replace(/\.css$/, `.${hash}.css`);
    if (nextName === fileName) continue;
    renameSync(oldPath, resolve(cssDir, nextName));

    const updateReferences = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const assetPath = resolve(directory, entry.name);
        if (entry.isDirectory()) updateReferences(assetPath);
        else if (/\.(?:html|rsc|js|json|css)$/.test(entry.name)) {
          const source = readFileSync(assetPath, "utf8");
          const next = source.replaceAll(fileName, nextName);
          if (next !== source) writeFileSync(assetPath, next);
        }
      }
    };
    updateReferences(outputDir);
  }
}

if (result.status && process.platform === "win32") {
  console.warn("Static export verified; ignoring Vinext's Windows libuv shutdown warning.");
}
writeFileSync(resolve(outputDir, "build-info.json"), JSON.stringify({ version: packageInfo.version, commit: process.env.GITHUB_SHA ?? "local", builtAt: new Date().toISOString() }, null, 2));
process.exit(0);
