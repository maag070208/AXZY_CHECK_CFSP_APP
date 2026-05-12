export interface ILocation {
  id: string;
  name: string;
  clientId: string;
  client?: any;
  zoneId: string;
  zone?: any;
  reference?: string;
  active: boolean;
}

export interface ILocationCreate {
  clientId: string;
  zoneId: string;
  name: string;
  reference?: string;
  active?: boolean;
}
