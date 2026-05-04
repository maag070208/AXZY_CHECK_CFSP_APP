import { store } from '../../core/store/redux.config';

export const getRoleValid = (role: string): boolean => {
  const state = store.getState();
  const userRoles = state.userState.role;

  if (!userRoles) {
    return false;
  }

  return userRoles.includes(role);
};
