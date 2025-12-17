import axios from 'axios';

const apiProxy = axios.create({
    baseURL: process.env.API_BASE_URL,
    timeout: 10000,
});

export const get = async (url: string, config = {}) => {
    try {
        const response = await apiProxy.get(url, config);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const post = async (url: string, data: any, config = {}) => {
    try {
        const response = await apiProxy.post(url, data, config);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const put = async (url: string, data: any, config = {}) => {
    try {
        const response = await apiProxy.put(url, data, config);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const del = async (url: string, config = {}) => {
    try {
        const response = await apiProxy.delete(url, config);
        return response.data;
    } catch (error) {
        throw error;
    }
};