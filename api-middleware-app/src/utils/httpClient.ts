import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const httpClient = axios.create({
    baseURL: process.env.API_BASE_URL,
    timeout: 10000, // Set a timeout for requests
});

// Function to make GET requests
export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return httpClient.get<T>(url, config);
};

// Function to make POST requests
export const post = async <T>(url: string, data: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return httpClient.post<T>(url, data, config);
};

// Function to make PUT requests
export const put = async <T>(url: string, data: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return httpClient.put<T>(url, data, config);
};

// Function to make DELETE requests
export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return httpClient.delete<T>(url, config);
};