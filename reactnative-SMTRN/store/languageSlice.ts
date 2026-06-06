import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDispatch } from './store';

export type Language = 'en' | 'ar';

interface LanguageState {
    language: Language;
}

const initialState: LanguageState = {
    language: 'en',
};

const languageSlice = createSlice({
    name: 'language',
    initialState,
    reducers: {
        setLanguage(state, action: PayloadAction<Language>) {
            state.language = action.payload;
        },
    },
});

export const { setLanguage } = languageSlice.actions;

// Thunk: persist to AsyncStorage
export const changeLanguage = (lang: Language) => async (dispatch: AppDispatch) => {
    await AsyncStorage.setItem('appLanguage', lang);
    dispatch(setLanguage(lang));
};

// Thunk: load saved language on app start
export const loadLanguage = () => async (dispatch: AppDispatch) => {
    const saved = await AsyncStorage.getItem('appLanguage');
    if (saved === 'en' || saved === 'ar') {
        dispatch(setLanguage(saved));
    }
};

export default languageSlice.reducer;