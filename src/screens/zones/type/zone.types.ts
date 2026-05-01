export interface IZone {
  id: number;
  name: string;
  clientId?: number;
  client?: any;
  active: boolean;
}

export interface IZoneCreate {
  name: string;
  clientId: number;
  active?: boolean;
}
