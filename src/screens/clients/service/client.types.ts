import { DataTableResponse } from '../../../core/types/DataTableTypes';
import { TResult } from '../../../core/types/TResult';

export interface IClient {
  id: string;
  name: string;
  address: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  contactPhone: string | null;
  active: boolean;
  softDelete: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    locations: number;
    zones: number;
    users: number;
  };
}

export interface IClientCreate {
  name: string;
  address?: string;
  rfc?: string;
  contactName?: string;
  contactPhone?: string;
  active?: boolean;
  appUsername?: string;
  appPassword?: string;
}

export interface IClientUpdate extends Partial<IClientCreate> {
  softDelete?: boolean;
}

export type TResultListClient = TResult<IClient[]>;
export type TResultClient = TResult<IClient>;
export type TResultDatatableClient = TResult<DataTableResponse<IClient>>;
