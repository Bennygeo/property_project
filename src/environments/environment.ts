function detectApiUrl(): string {
  if (typeof window === 'undefined') return '/p_demo_5/backend/api';
  const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
  const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';

  if (host.includes('onenewstory.in')) {
    return '/p_demo_5/backend/api';
  }
  if (path.includes('/p_demo_5')) return '/p_demo_5/backend/api';
  if (path.includes('/p_demo_4')) return '/p_demo_4/backend/api';
  if (path.includes('/p_demo_3')) return '/p_demo_3/backend/api';
  if (path.includes('/p_demo_2')) return '/p_demo_2/backend/api';
  if (path.includes('/p_demo_1')) return '/p_demo_1/backend/api';
  if (path.includes('/p_demo')) return '/p_demo/backend/api';
  if (path.includes('/demo1')) return '/demo1/backend/api';
  if (path.includes('/the-property-project')) return '/the-property-project/backend/api';
  if (window.location && window.location.port === '4200') {
    return '/api';
  }
  return '/p_demo_5/backend/api';
}

export const environment = {
  production: true,
  apiUrl: detectApiUrl(),
  pDemo5ApiUrl: '/p_demo_5/backend/api',
  pDemo4ApiUrl: '/p_demo_4/backend/api',
  pDemo3ApiUrl: '/p_demo_3/backend/api',
  pDemo2ApiUrl: '/p_demo_2/backend/api',
  pDemo1ApiUrl: '/p_demo_1/backend/api',
  demo1ApiUrl: '/demo1/backend/api',
  demo1RootApiUrl: '/demo1/api',
  apacheApiUrl: '/p_demo_5/backend/api',
  cliApiUrl: 'http://localhost:8000/api'
};
