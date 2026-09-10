export type DraftKind = "all" | "new" | "published";
export type DraftSort = "updated" | "oldest" | "title";

export function filterAndSortDrafts<T extends { id: string; savedAt: string; draft: { title: string; content: string } }>(drafts: T[], query: string, kind: DraftKind, sort: DraftSort) {
  const keyword = query.trim().toLowerCase();
  return drafts
    .filter((item) => kind === "all" || (kind === "published" ? item.id.startsWith("post-") : !item.id.startsWith("post-")))
    .filter((item) => !keyword || `${item.draft.title} ${item.draft.content}`.toLowerCase().includes(keyword))
    .sort((a, b) => sort === "title" ? (a.draft.title || "未命名草稿").localeCompare(b.draft.title || "未命名草稿", "zh-CN") : sort === "oldest" ? a.savedAt.localeCompare(b.savedAt) : b.savedAt.localeCompare(a.savedAt));
}

export function draftKindLabel(id: string) {
  return id.startsWith("post-") ? "文章修改" : "新文章";
}
