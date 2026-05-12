import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import { IAuthToken } from '../../types/IUser';

export interface IUserState {
  id: string | null;
  username: string | null;
  name: string | null;
  fullName: string | null;
  role: string | null;
  clientId: string | null;
  loginTime: string | null;
  token: string | null;
  isSignedIn: boolean;
}

const initialState: IUserState = {
  id: null,
  username: null,
  name: null,
  fullName: null,
  role: null,
  clientId: null,
  loginTime: null,
  token: null,
  isSignedIn: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string | null>) => {
      if (!action.payload) return initialState;

      const decoded = jwtDecode<IAuthToken>(action.payload);
      console.log('TOKEN DECODED: ', decoded);
      const fullName = `${decoded.name} ${decoded.lastName}`;
      state.id = String(decoded.id);
      state.username = fullName;
      state.name = fullName;
      state.fullName = fullName;
      state.role = decoded.role;
      state.clientId = decoded.clientId;
      state.loginTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      state.isSignedIn = true;
      state.token = action.payload;
    },

    logout: state => {
      state.id = null;
      state.username = null;
      state.fullName = null;
      state.role = null;
      state.clientId = null;
      state.token = null;
      state.isSignedIn = false;
    },
  },
});

export const { login, logout } = userSlice.actions;

export default userSlice.reducer;
