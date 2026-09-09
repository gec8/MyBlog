"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, GitCommitHorizontal, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

type BuildInfo = { version: string; commit: string; builtAt: string };
type RunInfo = { status: string; conclusion: string | null; html_url: string } | null;

export function SiteHealth({ run, onRefresh }: { run: RunInfo; onRefresh: () => void }) {
  const [build, setBuild] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("./build-info.json", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setBuild)
      .catch(() => setBuild(null))
      .finally(() => setLoading(false));
  }, []);

  const healthy = run?.status === "completed" && run.conclusion === "success";
  return <aside className="deploy-card health-card">
    <div>{healthy ? <CheckCircle2 /> : run?.status === "in_progress" ? <LoaderCircle className="spin" /> : <TriangleAlert />}<span><b>网站健康状态</b><small>版本与 GitHub Pages 部署</small></span></div>
    <strong className={healthy ? "ok" : ""}>{healthy ? "运行正常" : run?.status === "in_progress" ? "正在部署" : run ? "部署异常" : "等待读取"}</strong>
    <dl><div><dt><GitCommitHorizontal />当前版本</dt><dd>{loading ? "读取中…" : build?.version ?? "未知"} · {build?.commit?.slice(0, 7) ?? "local"}</dd></div><div><dt><Clock3 />最近部署</dt><dd>{build?.builtAt ? new Date(build.builtAt).toLocaleString("zh-CN") : "暂无记录"}</dd></div></dl>
    {run?.html_url && <a href={run.html_url} target="_blank" rel="noreferrer">查看部署详情</a>}
    <button onClick={onRefresh}><RefreshCw />刷新状态</button>
  </aside>;
}
