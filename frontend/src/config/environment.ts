const baseUrl = (value: string | undefined, fallback: string) =>
    `${(value?.trim() || fallback).replace(/\/+$/, '')}/`;

export const MAIN_API_BASE_URL = baseUrl(import.meta.env.VITE_MAIN_API_URL, 'http://localhost:5001/api/');
export const AI_API_BASE_URL = baseUrl(import.meta.env.VITE_AI_API_URL, 'http://localhost:8088/');
export const CRAWLER_ENABLED = import.meta.env.VITE_ENABLE_CRAWLER === 'true';
