export const API_CONSTANTS = {
  APP_VERSION: '1.0.0',
  BASE_URL: 'http://192.168.10.102:4444/api/v1',
  // PROD
  // BASE_URL: 'https://axzycheckcfspapi-production.up.railway.app/api/v1',
  //DEV
  // BASE_URL: 'https://axzycheckapidevelop-production.up.railway.app/api/v1',
  ROUND_COOLDOWN_MINUTES: 0,
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  URLS: {
    AUTH: {
      LOGIN: '/users/login',
      LOGOUT: '/users/logout',
    },
    ROUNDS: {
      START: '/rounds/start',
      END: '/rounds/end',
      CURRENT: '/rounds/current',
      ALL: '/rounds',
    },
    GUARD_LOGS: {
      CLOCK_IN: '/guard-logs/clock-in',
      CLOCK_OUT: '/guard-logs/clock-out',
    },
  },
};
