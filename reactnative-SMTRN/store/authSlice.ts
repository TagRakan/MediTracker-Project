import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../services/api';

const API_URL = `${BASE_URL}/api/auth`;

export const LOGIN_BAD_CREDENTIALS = '__BAD_CREDENTIALS__';
export const LOGIN_USER_NOT_FOUND  = '__USER_NOT_FOUND__';

interface AuthState {
    userId: number | null;
    username: string | null;
    name: string | null;
    accessToken: string | null;
    roles: string[];
    loading: boolean;
    error: string | null;
    responseMessage: string | null;
    isInitialized: boolean;
}

interface AuthResponse {
    username: string;
    id: number;
    name: string;
    accessToken: string;
    roles: string[];
    tokenType: string;
}

interface LoginCredentials { username: string; password: string; }

interface RegisterData {
    username: string;
    password: string;
    name: string;
    birthdate: string;
    roles?: string[];
}

const initialState: AuthState = {
    userId: null, username: null, name: null,
    accessToken: null, roles: [],
    loading: false, error: null, responseMessage: null, isInitialized: false,
};

const extractErrorMessage = (err: AxiosError<any>): string => {
    const data = err.response?.data;
    if (!data) return err.message ?? 'An unexpected error occurred.';
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (typeof data === 'object') {
        return (
            data.message ??
            data.error ??
            data.error_description ??
            (typeof data.errors === 'string' ? data.errors : null) ??
            'An unexpected error occurred.'
        );
    }
    return 'An unexpected error occurred.';
};

export const loginUser = createAsyncThunk<AuthResponse, LoginCredentials, { rejectValue: string }>(
    'auth/login', async (credentials, { rejectWithValue }) => {
        try {
            const res = await axios.post<AuthResponse>(`${API_URL}/login`, {
                username: credentials.username.toLowerCase(),
                password: credentials.password,
            });
            await AsyncStorage.setItem('token', res.data.accessToken);
            await AsyncStorage.setItem('username', res.data.username);
            await AsyncStorage.setItem('name', res.data.name);
            await AsyncStorage.setItem('userId', res.data.id.toString());
            await AsyncStorage.setItem('roles', JSON.stringify(res.data.roles));
            return res.data;
        } catch (err) {
            const e = err as AxiosError<any>;
            const status = e.response?.status;
            const body   = e.response?.data;

            console.log('[LOGIN ERROR] status:', status);
            console.log('[LOGIN ERROR] body:', JSON.stringify(body));
            console.log('[LOGIN ERROR] message:', e.message);

            if (status === 401 || status === 403) {
                return rejectWithValue(LOGIN_BAD_CREDENTIALS);
            }

            if (status === 400) {
                const text = typeof body === 'string' ? body.toLowerCase() : '';
                if (text.includes("doesn't exist") || text.includes('not found')) {
                    return rejectWithValue(LOGIN_USER_NOT_FOUND);
                }
                return rejectWithValue(LOGIN_BAD_CREDENTIALS);
            }

            if (!status) {
                return rejectWithValue(LOGIN_BAD_CREDENTIALS);
            }

            return rejectWithValue(extractErrorMessage(e));
        }
    }
);

export const registerUser = createAsyncThunk<string, RegisterData, { rejectValue: string }>(
    'auth/register', async (data, { rejectWithValue }) => {
        try {
            const payload: any = {
                username: data.username.toLowerCase(),
                password: data.password,
                name: data.name,
                birthdate: data.birthdate,
            };
            if (data.roles && data.roles.length > 0) {
                payload.roles = data.roles;
            }
            const res = await axios.post(`${API_URL}/register`, payload);
            return typeof res.data === 'string' ? res.data : 'User registered successfully!';
        } catch (err) {
            const e = err as AxiosError<any>;
            const body = e.response?.data;
            if (typeof body === 'string' && body.toLowerCase().includes('already in use')) {
                return rejectWithValue('An account with this email already exists.');
            }
            return rejectWithValue(extractErrorMessage(e));
        }
    }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
    await AsyncStorage.multiRemove(['token', 'username', 'name', 'userId', 'roles']);
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setError: (state, action: PayloadAction<string | null>) => { state.error = action.payload; },
        clearMessages: (state) => { state.error = null; state.responseMessage = null; },
        restoreToken: (state, action: PayloadAction<{
            accessToken: string; username: string;
            name: string; userId: number; roles: string[];
        } | null>) => {
            if (action.payload) {
                state.accessToken = action.payload.accessToken;
                state.username = action.payload.username;
                state.name = action.payload.name;
                state.userId = action.payload.userId;
                state.roles = action.payload.roles;
            }
            state.isInitialized = true;
        },
        clearAuth: (state) => {
            state.accessToken = null;
            state.username = null;
            state.name = null;
            state.userId = null;
            state.roles = [];
            state.error = null;
            state.responseMessage = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(loginUser.fulfilled, (s, a) => {
                s.loading = false; s.error = null;
                s.accessToken = a.payload.accessToken;
                s.username = a.payload.username;
                s.name = a.payload.name;
                s.userId = a.payload.id;
                s.roles = a.payload.roles;
            })
            .addCase(loginUser.rejected, (s, a) => {
                s.loading = false;
                s.error = a.payload ?? 'Login failed.';
            })
            .addCase(registerUser.pending, (s) => { s.loading = true; s.error = null; s.responseMessage = null; })
            .addCase(registerUser.fulfilled, (s, a) => { s.loading = false; s.responseMessage = a.payload; })
            .addCase(registerUser.rejected, (s, a) => {
                s.loading = false;
                s.error = String(a.payload) ?? 'Registration failed.';
            })
            .addCase(logoutUser.fulfilled, (s) => {
                s.accessToken = null; s.username = null; s.name = null;
                s.userId = null; s.roles = [];
            });
    },
});

export const { setError, clearMessages, restoreToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;