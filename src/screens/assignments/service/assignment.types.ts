
export enum AssignmentStatus {
  PENDING = 'PENDING',
  CHECKING = 'CHECKING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVIEWED = 'REVIEWED',
  ANOMALY = 'ANOMALY',
}

export interface IAssignment {
  id: string;
  guardId: string;
  locationId: string;
  assignedBy: string;
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
    aisle: string;
    spot: string;
    number: string;
  };
  guard?: {
    id: string;
    name: string;
    lastName: string;
  };
  tasks?: {
    id: string;
    description: string;
    reqPhoto: boolean;
    completed: boolean;
    completedAt?: string;
  }[];
}

export interface CreateAssignmentDTO {
  guardId: string;
  locationId: string;
  notes?: string;
  tasks?: { description: string; reqPhoto: boolean }[];
  assignedBy?: string;
}
