'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, GitCommitHorizontal, LoaderCircle, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { reportClientError } from '@/services/monitoring/client';

type BuildInfo = { version: string; commit: string; builtAt: string };
type RunInfo = { status: string; conclusion: string | null; html_url: string } | null;
type ErrorEvent = { id: string; source: string; severity: string; category: string; message: string; route?: string; created_at: string };

export function SiteHealth({ run, token, onRefresh }: { run: RunInfo; token: string; onRefresh: () => void }) {
  const [build, setBuild] = useState<BuildInfo | null>(null);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadErrors = useCallback(() => apiRequest<{ errors: ErrorEvent[]; openCount: number }>('/api/errors', {}, token)
    .then((result) => { setErrors(result.errors); setOpenCount(result.openCount); })
    .catch(() => { /* health summary remains available */ }), [token]);

  useEffect(() => {
    fetch('./build-info.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<BuildInfo> : Promise.reject(new Error('build info unavailable')))
      .then(setBuild)
      .catch(() => setBuild(null))
      .finally(() => setLoading(false));
    void loadErrors();
  }, [loadErrors]);

  useEffect(() => {
    if (run?.status === 'completed' && run.conclusion && run.conclusion !== 'success')
      reportClientError({ category: 'deployment', severity: 'error', message: `GitHub Pages 部署失败：${run.conclusion}` });
  }, [run?.status, run?.conclusion]);

  async function resolveError(errorId: string) {
    await apiRequest(`/api/errors/${encodeURIComponent(errorId)}`, { method: 'PATCH' }, token);
    await loadErrors();
  }

  const deployed = run?.status === 'completed' && run.conclusion === 'success';
  const healthy = deployed && openCount === 0;
  return <aside className="deploy-card health-card">
    <div>{healthy ? <CheckCircle2 /> : run?.status === 'in_progress' ? <LoaderCircle className="spin" /> : <TriangleAlert />}<span><b>网站健康状态</b><small>版本、部署与最近错误</small></span></div>
    <strong className={healthy ? 'ok' : ''}>{healthy ? '运行正常' : run?.status === 'in_progress' ? '正在部署' : openCount ? `${openCount} 个待处理问题` : run ? '部署异常' : '等待读取'}</strong>
    <dl><div><dt><GitCommitHorizontal />当前版本</dt><dd>{loading ? '读取中…' : build?.version ?? '未知'} · {build?.commit?.slice(0, 7) ?? 'local'}</dd></div><div><dt><Clock3 />最近部署</dt><dd>{build?.builtAt ? new Date(build.builtAt).toLocaleString('zh-CN') : '暂无记录'}</dd></div></dl>
    {errors.length > 0 && <section className="health-errors"><header><span><AlertTriangle />最近错误</span><b>{openCount} 个未处理</b></header>{errors.slice(0, 5).map((error) => <article key={error.id}><div><strong>{error.message}</strong><small>{error.source} · {error.category} · {new Date(error.created_at).toLocaleString('zh-CN')}</small>{error.route && <code>{error.route}</code>}</div><button onClick={() => void resolveError(error.id)}><ShieldCheck />标记已处理</button></article>)}</section>}
    {run?.html_url && <a href={run.html_url} target="_blank" rel="noreferrer">查看部署详情</a>}
    <button onClick={() => { onRefresh(); void loadErrors(); }}><RefreshCw />刷新状态</button>
  </aside>;
}
