import { get, post, put, remove } from '../../../core/axios';

export const createMaintenance = async (data: {
  title: string;
  description: string;
  locationId?: string;
  media: string[];
  // Additional fields for backend metadata
  categoryId?: string;
  typeId?: string;
  latitude?: number;
  longitude?: number;
  clientId?: string;
  guardId?: string;
}) => {
  try {
    // STRICT MaintenanceCreate Schema (based on react_llm_reference.txt)
    const payload: any = {
      title: data.title,
      description: data.description,
      media: data.media,
    };

    // Optional but recommended for relational parity
    if (data.locationId) payload.locationId = data.locationId;
    if (data.categoryId) payload.categoryId = data.categoryId;
    if (data.typeId) payload.typeId = data.typeId;
    if (data.latitude) payload.latitude = data.latitude;
    if (data.longitude) payload.longitude = data.longitude;
    if (data.clientId) payload.clientId = data.clientId;
    if (data.guardId) payload.guardId = data.guardId;

    console.log('[MaintenanceService] POST /maintenance payload:', JSON.stringify(payload, null, 2));

    const response = await post('/maintenance', payload);
    
    console.log('[MaintenanceService] POST /maintenance response:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error: any) {
    console.error('[MaintenanceService] POST /maintenance Exception:', error);
    return {
      success: false,
      data: null,
      messages: [error.message || 'Error al crear el mantenimiento'],
    };
  }
};

export const getMaintenances = async (filters?: {
  startDate?: Date;
  endDate?: Date;
  guardId?: string;
  category?: string;
  title?: string;
}) => {
  try {
    let query = '/maintenance?';
    const params = [];
    if (filters?.startDate)
      params.push(`startDate=${filters.startDate.toISOString()}`);
    if (filters?.endDate)
      params.push(`endDate=${filters.endDate.toISOString()}`);
    if (filters?.guardId) params.push(`guardId=${filters.guardId}`);
    if (filters?.category) params.push(`category=${filters.category}`);
    if (filters?.title) params.push(`title=${filters.title}`);

    if (params.length > 0) {
      query += params.join('&');
    } else {
      query = '/maintenance';
    }

    const response = await get(query);
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message] };
  }
};

export const getPaginatedMaintenances = async (params: {
  page: number;
  limit: number;
  filters?: any;
}) => {
  try {
    const response = await post('/maintenance/datatable', params);
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message] };
  }
};

export const resolveMaintenance = async (id: string) => {
  try {
    const response = await put(`/maintenance/${id}/resolve`);
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message] };
  }
};

export const deleteMaintenance = async (id: string) => {
  try {
    const response = await remove(`/maintenance/${id}`);
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message] };
  }
};

export const getPendingMaintenancesCount = async () => {
  try {
    const response = await get('/maintenance/pending-count');
    return response;
  } catch (error: any) {
    return { success: false, data: null, messages: [error.message] };
  }
};
