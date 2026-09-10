import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("components/blog-app.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const draftUtils = readFileSync("components/admin/draft-utils.ts", "utf8");

test("首页与文章路由保持可用", () => {
  assert.match(source, /view: ['"]home['"]/);
  assert.match(source, /view: ['"]post['"]/);
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
  assert.match(source, /markdown-editor/);
  assert.match(source, /editor-status/);
  assert.match(source, /toolbar-menu/);
  assert.match(source, /querySelector<HTMLDetailsElement>\(['"]\.insert-menu['"]\)/);
  assert.match(source, /nekopress-versions/);
  assert.match(source, /sessionStorage\.getItem\(['"]nekopress-token['"]\)/);
  assert.match(source, /sessionStorage\.removeItem\(['"]nekopress-token['"]\)/);
  assert.match(source, /deleteDraft/);
  assert.match(source, /undoDeleteDraft/);
  assert.match(source, /duplicateDraft/);
  assert.match(source, /batchDeleteDrafts/);
  assert.match(source, /confirmBatchDelete/);
  assert.match(source, /selectedDraftIds/);
  assert.match(source, /draft-filters/);
  assert.match(source, /loadRepoMedia/);
  assert.match(source, /uploadMediaLibrary/);
  assert.match(source, /mediaFileName/);
  assert.match(source, /mediaTypeOf/);
  assert.match(source, /githubError/);
  assert.match(source, /cache: ['"]no-store['"]/);
  assert.doesNotMatch(source, /['"]Cache-Control['"]: ['"]no-cache['"]/);
  assert.match(source, /已上传并加入列表/);
  assert.match(source, /searchPexels/);
  assert.match(source, /usePexelsPhoto/);
  assert.match(source, /nekopress-pexels-key/);
  assert.match(source, /coverCredit/);
  assert.match(source, /coverPosition/);
  assert.match(source, /coverBrightness/);
  assert.match(source, /coverOverlay/);
  assert.match(source, /coverKeywords/);
  assert.match(source, /coverPickerTab/);
  assert.match(source, /coverCategories/);
  assert.match(source, /pexelsCategory/);
  assert.match(source, /选择图片分类/);
  assert.match(source, /已从媒体库复用/);
  assert.match(source, /Photos provided by Pexels/);
  assert.match(css, /pexels-picker\.css/);
  assert.match(source, /deleteRepoMedia/);
  assert.match(source, /deleteSelectedMedia/);
  assert.match(source, /selectedMedia/);
  assert.match(source, /normalizeMediaUrl/);
  assert.match(source, /草稿：/);
  assert.match(source, /deleteRepoMediaWithoutConfirm/);
  assert.match(source, /loadBrowserImage/);
  assert.match(source, /使用中，不能删除/);
  assert.match(css, /media-filters/);
  assert.match(css, /media-actions/);
  assert.match(draftUtils, /filterAndSortDrafts/);
  assert.match(source, /meaningfulDraft/);
  assert.match(source, /登录会话已失效/);
  assert.match(source, /onPostsChange/);
  assert.match(source, /function applyPosts/);
  assert.match(source, /function openSavedDraft/);
  assert.match(source, /找不到要更新的原文章/);
  assert.match(source, /String\(post\.id\) === String\(editingId\)/);
});

test("音频语法与播放器状态完整", () => {
  assert.match(source, /@\\\[audio/);
  assert.match(source, /function AudioPlayer\(/);
  assert.match(source, /mediaState.*loading.*ready.*error/);
  assert.match(source, /<audio\s+ref=/);
  assert.match(source, /task-item/);
  assert.match(source, /<del key=/);
  assert.match(source, /<ol key=/);
  assert.match(source, /<table key=/);
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
