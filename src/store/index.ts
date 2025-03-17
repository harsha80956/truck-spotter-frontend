import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query/react';
import locationReducer from './slices/locationSlice';
import tripReducer from './slices/tripSlice';
import eldLogReducer from './slices/eldLogSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    location: locationReducer,
    trip: tripReducer,
    eldLog: eldLogReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 