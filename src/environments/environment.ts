function detectApiUrl(): string {
  if (typeof window === 'undefined') return '/P_demo_5/backend/api';
  const pathname = window.location.pathname || '';
  // Extract top-level folder with exact casing (e.g. /P_demo_5, /p_demo_5, /the-property-project)
  const match = pathname.match(/^(\/[^\/]+)/);
  const baseFolder = match ? match[1] : '';
  const lowerBase = baseFolder.toLowerCase();

  if (window.location.port === '4200') {
    return '/api';
  }

  if (lowerBase.includes('p_demo') || lowerBase.includes('demo1') || lowerBase.includes('property')) {
    return `${baseFolder}/backend/api`;
  }

  return baseFolder ? `${baseFolder}/backend/api` : '/P_demo_5/backend/api';
}

export const environment = {
  production: true,
  apiUrl: detectApiUrl(),
  pDemo5ApiUrl: '/P_demo_5/backend/api',
  pDemo4ApiUrl: '/p_demo_4/backend/api',
  pDemo3ApiUrl: '/p_demo_3/backend/api',
  pDemo2ApiUrl: '/p_demo_2/backend/api',
  pDemo1ApiUrl: '/p_demo_1/backend/api',
  demo1ApiUrl: '/demo1/backend/api',
  demo1RootApiUrl: '/demo1/api',
  apacheApiUrl: detectApiUrl(),
  cliApiUrl: 'http://localhost:8000/api'
};
