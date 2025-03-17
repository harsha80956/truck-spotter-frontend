import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Define the base API URL
const baseUrl = 'http://localhost:8000/api';

// Create the API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ 
    baseUrl,
    // Add any global headers or auth logic here
    prepareHeaders: (headers) => {
      console.log('Using API URL:', baseUrl);
      return headers;
    },
  }),
  tagTypes: ['Location', 'Trip', 'EldLog', 'DailyLog'],
  endpoints: () => ({}),
}); 