import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);

function titleLines(title) {
  const characters = Array.from(title.trim());
  const limit = characters.some((character) => /[\u3400-\u9fff]/.test(character)) ? 15 : 28;
  const lines = [];
  while (characters.length && lines.length < 3) lines.push(characters.splice(0, limit).join(''));
  if (characters.length && lines.length) lines[lines.length - 1] = `${lines.at(-1).slice(0, -1)}…`;
  return lines;
}

export async function generateOgCards() {
  const posts = JSON.parse(readFileSync(resolve('data/posts.json'), 'utf8'));
  const settings = JSON.parse(readFileSync(resolve('data/settings.json'), 'utf8'));
  const output = resolve('public/og');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });

  for (const post of posts) {
    const localCover = typeof post.coverImage === 'string' && !/^https?:/i.test(post.coverImage)
      ? resolve('public', post.coverImage.replace(/^\.?(?:\/|\\)/, ''))
      : null;
    let background = sharp({ create: { width: 1200, height: 630, channels: 4, background: '#17171c' } });
    try {
      if (localCover) background = sharp(localCover).resize(1200, 630, { fit: 'cover', position: 'centre' });
      background = background.composite([{ input: Buffer.from('<svg width="1200" height="630"><defs><linearGradient id="g"><stop stop-color="#111218" stop-opacity=".96"/><stop offset=".7" stop-color="#111218" stop-opacity=".62"/><stop offset="1" stop-color="#111218" stop-opacity=".35"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>') }]);
      const lines = titleLines(post.title);
      const title = lines.map((line, index) => `<text x="84" y="${270 + index * 78}" class="title">${escapeXml(line)}</text>`).join('');
      const overlay = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <style>.sans{font-family:"Noto Sans CJK SC","Microsoft YaHei","Arial Unicode MS",sans-serif}.title{font-family:"Noto Serif CJK SC","Microsoft YaHei","Arial Unicode MS",serif;font-size:64px;font-weight:800;fill:#fff;letter-spacing:-1px}.meta{font-size:25px;font-weight:700;fill:#ffd0d7}.brand{font-size:25px;font-weight:800;fill:#fff}.small{font-size:19px;font-weight:600;fill:#d7cfd4}</style>
        <rect x="84" y="64" width="58" height="58" rx="18" fill="#f04f64"/><text x="113" y="103" text-anchor="middle" class="sans brand">猫</text>
        <text x="160" y="102" class="sans brand">${escapeXml(settings.name)}</text>
        <text x="84" y="196" class="sans meta">${escapeXml(post.category)} · ${escapeXml(post.date)}</text>
        ${title}
        <line x1="84" y1="548" x2="1116" y2="548" stroke="#fff" stroke-opacity=".22"/>
        <text x="84" y="590" class="sans small">${escapeXml(post.author)} · ${Number(post.readMinutes) || 1} 分钟阅读</text>
        <text x="1116" y="590" text-anchor="end" class="sans small">gec8.github.io/MyBlog</text>
      </svg>`;
      await background.composite([{ input: Buffer.from(overlay) }]).jpeg({ quality: 86, mozjpeg: true }).toFile(resolve(output, `${post.slug}.jpg`));
    } catch (error) {
      throw new Error(`Failed to generate share card for ${post.slug}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await generateOgCards();
