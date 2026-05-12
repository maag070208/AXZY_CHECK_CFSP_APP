import { IClient } from '../../clients/service/client.types';

export interface IRole {
  id: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface IUser {
  id: string;
  name: string;
  lastName: string | null;
  username: string;
  active: boolean;
  softDelete: boolean;
  shiftStart: string | null;
  shiftEnd: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isLoggedIn: boolean;
  scheduleId: string | null;
  clientId: string | null;
  roleId: string;
  role: IRole;
  client?: IClient;
  schedule?: ISchedule;
  _count?: {
    rounds: number;
    incidents: number;
    assignments: number;
  };
}

export interface CreateUserDTO {
  name: string;
  lastName?: string;
  username: string;
  password?: string;
  roleId: string;
  clientId?: string;
  scheduleId?: string;
}

export interface UpdateUserDTO {
  name?: string;
  lastName?: string;
  username?: string;
  roleId?: string;
  clientId?: string;
  scheduleId?: string;
  active?: boolean;
}

export interface IRoleOption {
  label: string;
  value: string | null;
}
