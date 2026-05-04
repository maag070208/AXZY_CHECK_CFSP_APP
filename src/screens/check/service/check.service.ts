import { post, patch } from '../../../core/axios';

export const registerCheck = async (locationId: string, userId: string, notes?: string, media?: any[], latitude?: number, longitude?: number, assignmentId?: string): Promise<{ success: boolean; data: any }> => {
  const response = await post('/kardex', {
    locationId,
    userId,
    notes,
    media,
    latitude,
    longitude,
    assignmentId,
  });
  return { success: true, data: response.data };
};

export const updateCheck = async (kardexId: string, notes?: string, media?: any[]): Promise<{ success: boolean; data: any }> => {
  const response = await patch(`/kardex/${kardexId}`, {
    notes,
    media,
  });
  return { success: true, data: response.data };
};
