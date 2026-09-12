const monitorEndpoint = 'https://nekopress-auth.wangshirufengabc.workers.dev/api/errors';

export type ClientErrorReport = {
  category: 'render' | 'network' | 'api' | 'deployment';
  message: string;
  detail?: string;
  severity?: 'warning' | 'error' | 'fatal';
};

export function reportClientError(report: ClientErrorReport) {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({
    source: 'frontend',
    severity: report.severity ?? 'error',
    category: report.category,
    message: report.message.slice(0, 500),
    detail: report.detail?.slice(0, 4000),
    route: `${window.location.pathname}${window.location.hash}`.slice(0, 500),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(monitorEndpoint, new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch(monitorEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
  } catch { /* monitoring must never break the page */ }
}

export function installGlobalErrorMonitoring() {
  const onError = (event: ErrorEvent) => reportClientError({ category: 'render', severity: 'fatal', message: event.message || '页面脚本异常', detail: event.error?.stack });
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    reportClientError({ category: 'render', message: reason instanceof Error ? reason.message : String(reason), detail: reason instanceof Error ? reason.stack : undefined });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
