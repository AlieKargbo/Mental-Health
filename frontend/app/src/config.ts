// src/config.ts
// Centralized configuration for API endpoints

const getApiBaseUrl = (): string => {
  // Debug: Log all available environment variables
  console.log('All import.meta.env:', import.meta.env);
  
  // In production build, the environment variable should be embedded
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  
  console.log('Raw environment variable VITE_API_BASE_URL:', envUrl);
  console.log('Environment mode:', import.meta.env?.MODE);
  console.log('Environment dev flag:', import.meta.env?.DEV);
  console.log('Environment prod flag:', import.meta.env?.PROD);
  
  // Clean check: Ensure it is a valid string and NOT the literal words "undefined" or "null"
  if (envUrl && envUrl.trim() !== '' && envUrl !== 'undefined' && envUrl !== 'null') {
    console.log('✅ Using API URL from environment:', envUrl);
    return envUrl.trim();
  }
  
  // Production fallback - require explicit env var for production builds.
  // Default to development host but warn loudly to prevent accidental calls
  // to a hardcoded third-party backend when VITE_API_BASE_URL is missing.
  if (import.meta.env?.PROD) {
    const fallbackDev = 'http://localhost:8000';
    console.warn(
      'VITE_API_BASE_URL is not set for production build. Defaulting to',
      fallbackDev,
      '\nPlease set VITE_API_BASE_URL during your CI/build step to the correct backend URL for production.'
    );
    return fallbackDev;
  }
  
  // Development fallback
  const devUrl = 'http://localhost:8000';
  console.log('Using development API URL (fallback):', devUrl);
  return devUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Normalize base URL (remove any trailing slashes) to avoid accidental '//' when
// joining paths (some hosts may reject double slashes).
const normalizeBase = (url: string) => url.replace(/\/+$/, '');
const BASE = normalizeBase(API_BASE_URL);

// Export individual endpoint builders
export const endpoints = {
  checkin: `${BASE}/checkin`,
  authAnon: `${BASE}/auth/anon`,
} as const;

// Log the final configuration for debugging
console.log(' Final API Configuration:', {
  baseUrl: API_BASE_URL,
  endpoints,
  envVarValue: import.meta.env?.VITE_API_BASE_URL || 'NOT SET',
  mode: import.meta.env?.MODE || 'UNKNOWN'
});