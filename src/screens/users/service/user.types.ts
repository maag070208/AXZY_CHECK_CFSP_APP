import { UserRole } from '../../../core/types/IUser';

export interface CreateUserDTO {
  name: string;
  lastName: string;
  username: string;
  password?: string;
  roleId?: string;
  role?: any;
  scheduleId?: string;
}

export interface IUser {
  id: string;
  name: string;
  lastName: string;
  username: string;
  role: {
    id: string;
    name: string;
    value: string;
  };
  active: boolean;
  shiftStart?: string;
  shiftEnd?: string;
}
export interface IRoleOption {
  label: string;
  value: string | null;
}
