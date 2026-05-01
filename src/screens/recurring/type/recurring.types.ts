export interface IRecurringTask {
  id: number;
  description: string;
  reqPhoto: boolean;
}

export interface IRecurringLocation {
  id: number;
  locationId: number;
  location?: {
    id: number;
    name: string;
  };
  tasks: IRecurringTask[];
}

export interface IRecurringConfig {
  id: number;
  title: string;
  clientId?: number;
  client?: {
    id: number;
    name: string;
  };
  active: boolean;
  locations: IRecurringLocation[];
  guards?: {
    id: number;
    name: string;
    lastName: string;
  }[];
  _count?: {
    locations: number;
    guards: number;
  };
}
