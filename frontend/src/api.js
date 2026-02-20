import axios from 'axios';

const API_BASE_URL = '';

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Add Interceptor for Token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('voter_token');
    if (token && token !== 'undefined') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add Interceptor for Responses (401 Handling)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Session Expired - Auto Logout Triggered");
            localStorage.removeItem('voter_token');
            localStorage.removeItem('voter_role');
            localStorage.removeItem('voter_user');
            // Force reload to clear React state
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

const api = {
    login: async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        const response = await client.post('/api/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (response.data.access_token) {
            localStorage.setItem('voter_token', response.data.access_token);
            localStorage.setItem('voter_role', response.data.role);
            localStorage.setItem('voter_user', response.data.username);
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('voter_token');
        localStorage.removeItem('voter_role');
        localStorage.removeItem('voter_user');
    },

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

    startExtract: async (batchId, directPdf = false) => {
        const response = await client.post(`/api/extract/${batchId}`, { direct_pdf: directPdf });
        return response.data;
    },

    startProcess: async (batchId, useGemini = false, directPdf = false) => {
        const response = await client.post(`/api/process-batch/${batchId}`, { use_gemini: useGemini, direct_pdf: directPdf });
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
    deleteVoterFromBatch: async (batchId, voterId) => {
        const response = await client.delete(`/api/batch/${batchId}/voter/${voterId}`);
        return response.data;
    },
    exportBatchCSV: (batchId) => {
        client.get(`/api/batch/${batchId}/export-csv`, { responseType: 'blob' })
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `ocr_batch_${batchId}.csv`);
                document.body.appendChild(link);
                link.click();
            }).catch(e => alert("Download Error: " + e.message));
    },

    saveToDB: async (batchId, constituency, lgbType, lgbName, booth, psNo, psName) => {
        const response = await client.post(`/api/save-to-db`, {
            batch_id: batchId,
            constituency,
            lgb_type: lgbType,
            lgb_name: lgbName,
            booth,
            ps_no: psNo,
            ps_name: psName
        });
        return response.data;
    },

    getConstituencies: async () => {
        const response = await client.get('/api/constituencies');
        return response.data;
    },

    getLocalBodies: async (constituency) => {
        const response = await client.get('/api/local-bodies', { params: { constituency } });
        return response.data;
    },

    clearSession: async (batchId) => {
        const response = await client.post(`/api/clear-session/${batchId}`);
        return response.data;
    },

    stopAndClearRAM: async (batchId) => {
        const response = await client.post(`/api/batch/${batchId}/cancel`);
        return response.data;
    },

    exportVoters: (filters) => {
        client.get(`/api/export-voters`, { params: filters, responseType: 'blob' })
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `voters_export.csv`);
                document.body.appendChild(link);
                link.click();
            }).catch(e => alert("Access Denied or Download Error: " + (e.response?.status === 403 ? "Restricted for Employees" : e.message)));
    },

    getStats: async (constituency = null, lb = null, booth = null) => {
        const response = await client.get('/api/stats', { params: { constituency, lb, booth } });
        return response.data;
    },

    getStrategicAnalytics: async (constituencyId = null) => {
        const response = await client.get('/api/analytics/strategic', { params: { constituency_id: constituencyId } });
        return response.data;
    },

    getWarRoomStats: async (filters) => {
        const response = await client.get('/api/war-room/stats', { params: filters });
        return response.data;
    },

    getVoters: async (filters = {}) => {
        const response = await client.get('/api/voters', { params: filters });
        return response.data;
    },

    editVoterInDB: async (voterId, data) => {
        const response = await client.post(`/api/edit-voter/${voterId}`, data);
        return response.data;
    },

    // Admin APIs
    getLocations: async () => {
        const response = await client.get('/api/admin/locations');
        return response.data;
    },
    addConst: async (name) => {
        const response = await client.post('/api/admin/add-const', { name });
        return response.data;
    },
    addLB: async (constId, name, type) => {
        const response = await client.post('/api/admin/add-lb', { const_id: constId, name, type });
        return response.data;
    },
    addBooth: async (constId, lbId, number, psName, psNo) => {
        const response = await client.post('/api/admin/add-booth', { const_id: constId, lb_id: lbId, number, ps_name: psName, ps_no: psNo });
        return response.data;
    },
    getUsers: async () => {
        const response = await client.get('/api/admin/users');
        return response.data;
    },
    createManagedUser: async (data) => {
        const response = await client.post('/api/admin/create-user', data);
        return response.data;
    },
    updateManagedUser: async (uid, data) => {
        const response = await client.put(`/api/admin/update-user/${uid}`, data);
        return response.data;
    },
    deleteUser: async (uid) => {
        const response = await client.delete(`/api/admin/delete-user/${uid}`);
        return response.data;
    },
    getParties: async () => {
        const response = await client.get('/api/parties');
        return response.data;
    },
    addParty: async (name, shortLabel, color, gradient, file) => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('short_label', shortLabel);
        formData.append('primary_color', color);
        formData.append('accent_gradient', gradient);
        formData.append('file', file);
        const response = await client.post('/api/admin/parties', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    sendBroadcast: async (data) => {
        const response = await client.post('/api/comm/send', data);
        return response.data;
    },
    sendBroadcastForm: async (data) => {
        const formData = new FormData();
        formData.append('heading', data.heading || '');
        formData.append('message', data.message);
        formData.append('medium', data.medium);
        formData.append('filters', data.filters || '{}');
        if (data.image) formData.append('image', data.image);

        const response = await client.post('/api/comm/send-form', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getCommStats: async () => {
        const response = await client.get('/api/comm/stats');
        return response.data;
    },

    getTemplates: async () => {
        const response = await client.get('/api/comm/templates');
        return response.data;
    }
};


export default api;
