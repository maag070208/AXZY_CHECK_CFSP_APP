export interface IZone {
  id: string;
  name: string;
  clientId?: string;
  client?: any;
  active: boolean;
  _count?: { locations: number };
}

export interface IZoneCreate {
  name: string;
  clientId: string;
  active?: boolean;
}
