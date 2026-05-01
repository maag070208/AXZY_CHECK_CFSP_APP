export interface IClient {
  id: number;
  name: string;
  address?: string;
  rfc?: string;
  contactName?: string;
  contactPhone?: string;
  active: boolean;
  users?: any[];
  createdAt?: string;
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
