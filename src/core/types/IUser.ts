export interface IAuthToken {
  id: string;
  name: string;
  lastName: string;
  username: string;
  clientId: string | null;
  role: string;
  active: boolean;

  // Metadata
  iat: number;
  exp: number;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SHIFT = 'SHIFT',
  GUARD = 'GUARD',
  MAINT = 'MAINT',
  RESDN = 'RESDN',
}

export interface IRole {
  id: string;
  name: UserRole;
  value: string;
}

export interface IUser {
  id: string;
  name: string;
  lastName: string;
  username: string;
  active: boolean;
  role: IRole | string;
  schedule?: { id: string; name: string };
  clientId?: string | null;
}
