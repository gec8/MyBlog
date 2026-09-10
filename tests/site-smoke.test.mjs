import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/blog-app.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

test("首页与文章路由保持可用", () => {
  assert.match(source, /view: "home"/);
  assert.match(source, /view: "post"/);
  assert.match(source, /function Home\(/);
  assert.match(source, /function Article\(/);
});

test("后台编辑和发布入口存在", () => {
  assert.match(source, /function Admin\(/);
  assert.match(source, /发布前检查/);
  assert.match(source, /content-editor/);
  assert.match(source, /find-replace/);
  assert.match(source, /editorOutline/);
  assert.match(source, /normalizeMarkdown/);
  assert.match(source, /const heading = prefix\.match/);
  assert.match(source, /nekopress-versions/);
  assert.match(source, /sessionStorage\.getItem\("nekopress-token"\)/);
  assert.match(source, /sessionStorage\.removeItem\("nekopress-token"\)/);
});

test("音频语法与播放器状态完整", () => {
  assert.match(source, /@\\\[audio/);
  assert.match(source, /function AudioPlayer\(/);
  assert.match(source, /mediaState.*loading.*ready.*error/);
  assert.match(source, /<audio ref=/);
  assert.match(source, /task-item/);
  assert.match(source, /<del key=/);
});

test("移动端限制横向溢出", () => {
  assert.match(css, /max-width:100%/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /@media\(max-width:560px\)/);
});

test("构建产物包含首页与健康信息", () => {
  assert.ok(existsSync("dist/client/index.html"));
  assert.ok(existsSync("dist/client/build-info.json"));
});
