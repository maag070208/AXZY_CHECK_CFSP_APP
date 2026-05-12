export const API_CONSTANTS = {
  // BASE_URL: 'http://192.168.10.106:4444/api/v1',
  // BASE_URL: 'https://axzycheckcfspapi-production.up.railway.app/api/v1',
  BASE_URL: 'https://axzycheckapidevelop-production.up.railway.app/api/v1',
  ROUND_COOLDOWN_MINUTES: 0,
  TIMEOUT: 5000,
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
  },
};
//
