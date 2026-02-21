import api from '../api';

export const printersAPI = {
    list: async (params) => {
        const response = await api.get('/printers', { params });
        return response.data;
    },

    get: async (id) => {
        const response = await api.get(`/printers/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/printers', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/printers/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        await api.delete(`/printers/${id}`);
    },

    // Jobs
    submitJob: async (venueId, jobData) => {
        const response = await api.post('/print/jobs', jobData, {
            params: { venue_id: venueId }
        });
        return response.data;
    },

    listJobs: async (venueId, params) => {
        const response = await api.get('/print/jobs', {
            params: { venue_id: venueId, ...params }
        });
        return response.data;
    }
};

export const printerTemplatesAPI = {
    list: async (params?: /**/any) => {
        const response = await api.get('/printer-templates', { params });
        return response.data;
    },

    create: async (data: /**/any) => {
        const response = await api.post('/printer-templates', data);
        return response.data;
    },

    update: async (id: string, data: /**/any | null) => {
        const response = await api.put(`/printer-templates/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await api.delete(`/printer-templates/${id}`);
    }
};
