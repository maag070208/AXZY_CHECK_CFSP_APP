export const API_CONSTANTS = {
  APP_VERSION: '1.0.0',
  BASE_URL: 'http://172.20.10.4:4444/api/v1',
  // PROD
  // BASE_URL: 'https://axzycheckcfspapi-production.up.railway.app/api/v1',
  //DEV
  // BASE_URL: 'https://axzycheckapidevelop-production.up.railway.app/api/v1',
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
