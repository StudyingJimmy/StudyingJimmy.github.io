const configuredBase = String(window.LILY_API_BASE || '').replace(/\/$/, '');

export function apiUrl(path) {
  if (!configuredBase || configuredBase.includes('REPLACE_WITH_WORKER_URL')) return path;
  return configuredBase + path;
}
