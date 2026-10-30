function detectApiUrl(): string {
  if (typeof window === 'undefined') return '/P_demo_4/backend/api';
  if (window.location && (window.location.port === '4200' || window.location.hostname === 'localhost')) {
    return '/api';
  }
  const path = window.location.pathname;
  if (path.includes('/P_demo_4')) return '/P_demo_4/backend/api';
  if (path.includes('/p_demo_4')) return '/p_demo_4/backend/api';
  if (path.includes('/p_demo_3')) return '/p_demo_3/backend/api';
  if (path.includes('/p_demo_2')) return '/p_demo_2/backend/api';
  if (path.includes('/p_demo_1')) return '/p_demo_1/backend/api';
  if (path.includes('/p_demo')) return '/p_demo/backend/api';
  if (path.includes('/demo1')) return '/demo1/backend/api';
  return '/api';
}

export const environment = {
  production: true,
  apiUrl: detectApiUrl(),
  pDemo4ApiUrl: '/P_demo_4/backend/api',
  pDemo3ApiUrl: '/p_demo_3/backend/api',
  pDemo2ApiUrl: '/p_demo_2/backend/api',
  pDemo1ApiUrl: '/p_demo_1/backend/api',
  demo1ApiUrl: '/demo1/backend/api',
  demo1RootApiUrl: '/demo1/api',
  apacheApiUrl: 'http://localhost/the-property-project/backend/api',
  cliApiUrl: 'http://localhost:8000/api'
};
