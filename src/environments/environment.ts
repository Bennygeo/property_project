const isDemo1 = typeof window !== 'undefined' && window.location.pathname.includes('/demo1');

export const environment = {
  production: true,
  apiUrl: isDemo1 ? '/demo1/backend/api' : '/api',
  demo1ApiUrl: '/demo1/backend/api',
  demo1RootApiUrl: '/demo1/api',
  apacheApiUrl: 'http://localhost/the-property-project/backend/api',
  cliApiUrl: 'http://localhost:8000/api'
};

