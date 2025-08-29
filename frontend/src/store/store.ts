import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import caseReducer from './slices/caseSlice';
import sosReducer from './slices/sosSlice';
import chatReducer from './slices/chatSlice';
import reportReducer from './slices/reportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cases: caseReducer,
    sos: sosReducer,
    chat: chatReducer,
    reports: reportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;