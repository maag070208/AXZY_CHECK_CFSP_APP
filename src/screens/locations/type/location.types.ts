export interface ILocation {
  id: number;
  name: string;
  clientId: number;
  client?: any;
  zoneId: number;
  zone?: any;
  reference?: string;
  active: boolean;
}

export interface ILocationCreate {
  clientId: number;
  zoneId: number;
  name: string;
  reference?: string;
  active?: boolean;
}
