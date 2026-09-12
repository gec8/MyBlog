import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const outputDir = resolve("dist/client");
const packageInfo = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const posts = JSON.parse(readFileSync(resolve("data/posts.json"), "utf8"));
const settings = JSON.parse(readFileSync(resolve("data/settings.json"), "utf8"));
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

// Vinext exports non-ASCII dynamic routes with percent-encoded filenames.
// GitHub Pages decodes the request path before resolving the file, so keep a
// decoded filename alongside the encoded one. This preserves existing links
// and makes Chinese (and other Unicode) article slugs work reliably.
const postOutputDir = resolve(outputDir, "post");
if (existsSync(postOutputDir)) {
  for (const fileName of readdirSync(postOutputDir)) {
    if (!/%[0-9a-f]{2}/i.test(fileName)) continue;
    try {
      const decodedName = decodeURIComponent(fileName);
      if (
        decodedName !== fileName &&
        !decodedName.includes("/") &&
        !decodedName.includes("\\")
      ) {
        copyFileSync(resolve(postOutputDir, fileName), resolve(postOutputDir, decodedName));
      }
    } catch {
      console.warn(`Skipped invalid encoded article filename: ${fileName}`);
    }
  }
}

if (result.status && process.platform === "win32") {
  console.warn("Static export verified; ignoring Vinext's Windows libuv shutdown warning.");
}
writeFileSync(resolve(outputDir, "build-info.json"), JSON.stringify({ version: packageInfo.version, commit: process.env.GITHUB_SHA ?? "local", builtAt: new Date().toISOString() }, null, 2));

// Metadata routes are not exported by every Vinext release, so emit portable
// feed files here as a final, framework-independent build step.
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]);
const articleUrl = (post) => `${siteUrl}/post/${encodeURIComponent(post.slug)}`;
const sitemapEntries = [
  `<url><loc>${escapeXml(`${siteUrl}/`)}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  ...posts.map((post) => `<url><loc>${escapeXml(articleUrl(post))}</loc><lastmod>${escapeXml(post.date)}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),
].join("");
writeFileSync(resolve(outputDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}</urlset>`);
const rssItems = posts.map((post) => `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(articleUrl(post))}</link><guid isPermaLink="true">${escapeXml(articleUrl(post))}</guid><description>${escapeXml(post.excerpt)}</description><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><category>${escapeXml(post.category)}</category></item>`).join("");
writeFileSync(resolve(outputDir, "rss.xml"), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(settings.name)}</title><link>${escapeXml(`${siteUrl}/`)}</link><description>${escapeXml(settings.description)}</description><language>zh-CN</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${rssItems}</channel></rss>`);
process.exit(0);
