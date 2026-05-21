import { dashboardAxios } from '../utils/axios.utils';
export const contentService = {
    list: async (deviceId) => {
        const response = await dashboardAxios.get(`/api/v1/device/${deviceId}/content`);
        return response.data.data;
    },
    createWebpage: async (deviceId, payload) => {
        const body = new FormData();
        body.append('type', 'WEBPAGE');
        body.append('url', payload.url);
        body.append('order', String(payload.order));
        body.append('duration', String(payload.duration));
        await dashboardAxios.post(`/api/v1/device/${deviceId}/content`, body);
    },
    uploadMedia: async (deviceId, payload) => {
        const body = new FormData();
        body.append('type', payload.type);
        body.append('order', String(payload.order));
        if (payload.duration) {
            body.append('duration', String(payload.duration));
        }
        body.append('file', payload.file);
        await dashboardAxios.post(`/api/v1/device/${deviceId}/content`, body);
    },
    remove: async (deviceId, contentId) => {
        await dashboardAxios.delete(`/api/v1/device/${deviceId}/content/${contentId}`);
    },
    reorder: async (deviceId, contentIds) => {
        await dashboardAxios.put(`/api/v1/device/${deviceId}/content/playlist/order`, {
            contentIds
        });
    }
};
