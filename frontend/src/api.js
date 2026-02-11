import axios from 'axios';

const API_BASE_URL = ''; // Relative for unified serving

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

const api = {
    checkHealth: async () => {
        const response = await client.get('/api/health');
        return response.data;
    },

    uploadPDF: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    extractBoxes: async (batchId) => {
        const response = await client.post(`/api/extract/${batchId}`);
        return response.data;
    },

    processBatch: async (batchId) => {
        const response = await client.post(`/api/process-batch/${batchId}`);
        return response.data;
    },

    getBatchStatus: async (batchId) => {
        const response = await client.get(`/api/batch/${batchId}/status`);
        return response.data;
    },

    updateVoter: async (batchId, voterId, data) => {
        const response = await client.post(`/api/update-voter/${batchId}/${voterId}`, data);
        return response.data;
    },

    saveToDB: async (batchId, constituency, booth) => {
        const response = await client.post(`/api/save-to-db`, null, {
            params: { batch_id: batchId, constituency, booth }
        });
        return response.data;
    },

    getConstituencies: async () => {
        const response = await client.get('/api/constituencies');
        return response.data;
    },

    clearSession: async (batchId) => {
        const response = await client.post(`/api/clear-session/${batchId}`);
        return response.data;
    },

    downloadCSV: (batchId) => {
        // Direct link download
        window.open(`/api/download-csv/${batchId}`, '_blank');
    }
};

export default api;
