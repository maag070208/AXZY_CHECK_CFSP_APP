import { get, post, put, remove } from '../../../core/axios';

export const createIncident = async (data: {
    title: string;
    description: string;
    locationId: string;
    media: string[];
    // Additional fields for backend but not in IncidentCreate schema
    categoryId?: string;
    typeId?: string;
    latitude?: number;
    longitude?: number;
    clientId?: string;
    roundId?: string;
    guardId?: string;
}) => {
    try {
        // STRICT IncidentCreate Schema
        const payload: any = {
            title: data.title,
            description: data.description,
            locationId: data.locationId,
            media: data.media
        };

        // Add non-schema fields if API allows them in the same endpoint
        if (data.categoryId) payload.categoryId = data.categoryId;
        if (data.typeId) payload.typeId = data.typeId;
        if (data.latitude) payload.latitude = data.latitude;
        if (data.longitude) payload.longitude = data.longitude;
        if (data.clientId) payload.clientId = data.clientId;
        if (data.roundId) payload.roundId = data.roundId;
        if (data.guardId) payload.guardId = data.guardId;

        console.log('[IncidentService] POST /incidents payload:', JSON.stringify(payload, null, 2));

        const response = await post('/incidents', payload);
        
        console.log('[IncidentService] POST /incidents response:', JSON.stringify(response, null, 2));
        
        return response;

    } catch (error: any) {
        console.error('[IncidentService] POST /incidents Exception:', error);
        return { success: false, data: null, messages: [error.message || 'Error al crear la incidencia'] };
    }
};

export const getPaginatedIncidents = async (params: {
    page: number;
    limit: number;
    filters?: any;
    sort?: { key: string; direction: 'asc' | 'desc' };
}) => {
    try {
        const response = await post('/incidents/datatable', params);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getIncidents = async (filters?: {
    startDate?: Date;
    endDate?: Date;
    guardId?: string;
    category?: string;
    title?: string;
}) => {
    try {
        let query = '/incidents?';
        const params = [];
        if (filters?.startDate) params.push(`startDate=${filters.startDate.toISOString()}`);
        if (filters?.endDate) params.push(`endDate=${filters.endDate.toISOString()}`);
        if (filters?.guardId) params.push(`guardId=${filters.guardId}`);
        if (filters?.category) params.push(`category=${filters.category}`);
        if (filters?.title) params.push(`title=${filters.title}`);
        
        const response = await get(query + params.join('&'));
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const resolveIncident = async (id: string) => {
    try {
        const response = await put(`/incidents/${id}/resolve`);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const deleteIncident = async (id: string) => {
    try {
        const response = await remove(`/incidents/${id}`);
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};

export const getPendingIncidentsCount = async () => {
    try {
        const response = await get('/incidents/pending-count');
        return response;
    } catch (error: any) {
        return { success: false, data: null, messages: [error.message] };
    }
};
