import { dashboardAxios } from '../utils/axios.utils';
export const deviceService = {
    list: async () => {
        const response = await dashboardAxios.get('/api/v1/device');
        return response.data.data;
    },
    getById: async (deviceId) => {
        const response = await dashboardAxios.get(`/api/v1/device/${deviceId}`);
        return response.data.data;
    },
    getTestingPairingCodes: async () => {
        const response = await dashboardAxios.get('/api/v1/device/testing/pairing-codes');
        return response.data.data;
    },
    generateTestingPairingCodes: async (count = 5) => {
        const response = await dashboardAxios.post('/api/v1/device/testing/pairing-codes/generate', {
            count
        });
        return response.data.data;
    },
    pairByCode: async (pairingCode) => {
        await dashboardAxios.post('/api/v1/device/pair/confirm', {
            pairingCode
        });
    }
};
