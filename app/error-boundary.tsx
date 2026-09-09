"use client";

import { Component, ErrorInfo, ReactNode } from "react";

export class SiteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NekoPress render error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="site-error" role="alert">
      <span>猫</span>
      <p>PAGE RECOVERY</p>
      <h1>页面没有正常打开</h1>
      <small>可能是浏览器缓存或暂时的网络波动，文章内容不会丢失。</small>
      <div><button onClick={() => window.location.reload()}>重新加载</button><button onClick={() => { window.location.hash = ""; this.setState({ failed: false }); }}>返回首页</button></div>
    </main>;
  }
}
