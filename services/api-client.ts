import { reportClientError } from '@/services/monitoring/client';

export const authApi = 'https://nekopress-auth.wangshirufengabc.workers.dev';

export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token = '') {
  let response: Response;
  try {
    response = await fetch(`${authApi}${path}`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch {
    reportClientError({ category: 'network', message: `请求失败：${path}` });
    throw new ApiError('网络连接失败。草稿仍保存在本机，请检查网络后重试。');
  }
  let result: T & { error?: string };
  try { result = (await response.json()) as T & { error?: string }; }
  catch { result = {} as T & { error?: string }; }
  if (!response.ok) {
    if (response.status >= 500) reportClientError({ category: 'api', message: `接口异常：${path}`, detail: result.error, severity: 'error' });
    const fallback = response.status === 401
      ? '登录已失效，请重新登录。'
      : response.status === 403
        ? '当前账号没有执行此操作的权限。'
        : response.status === 409
          ? '线上内容已更新，请刷新后再试。'
          : response.status === 413
            ? '提交的文件或内容超过大小限制。'
            : response.status === 429
              ? '操作过于频繁，请稍后再试。'
              : response.status >= 500
                ? '发布服务暂时不可用，请稍后重试。'
                : '操作未完成，请检查填写内容。';
    throw new ApiError(result.error || fallback, response.status);
  }
  return result;
}
