import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import doseReducer from './doseSlice';
import doseLogReducer from './doseLogSlice';
import familyReducer from './familySlice';
import medicationReducer from './medicationSlice';
import messageReducer from './messageSlice';
import languageReducer from './languageSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        doses: doseReducer,
        doseLogs: doseLogReducer,
        family: familyReducer,
        medications: medicationReducer,
        messages: messageReducer,
        language: languageReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;