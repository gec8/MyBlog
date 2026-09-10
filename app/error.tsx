"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("NekoPress page error", error); }, [error]);
  return <main className="site-error" role="alert">
    <span>!</span>
    <p>PAGE ERROR</p>
    <h1>页面暂时无法显示</h1>
    <small>内容仍然安全保存。请先尝试重新加载；如果问题持续，可以返回首页。</small>
    <div><button onClick={reset}>重新加载</button><button onClick={() => { window.location.hash = "#"; window.location.reload(); }}>返回首页</button></div>
  </main>;
}
