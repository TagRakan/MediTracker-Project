import './global.css';
import React, { useEffect, ReactNode } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, RootState, AppDispatch } from '../store/store';
import { restoreToken } from '../store/authSlice';
import { loadLanguage } from '../store/languageSlice';
import { View, ActivityIndicator } from 'react-native';
import { FontProvider } from '../context/FontContext';

function AuthGuard({ children }: { children: ReactNode }) {
    const dispatch = useDispatch<AppDispatch>();
    const { accessToken, isInitialized } = useSelector((s: RootState) => s.auth);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        const hydrate = async () => {
            await dispatch(loadLanguage());

            const [token, username, name, userIdStr, rolesStr] = await Promise.all([
                AsyncStorage.getItem('token'),
                AsyncStorage.getItem('username'),
                AsyncStorage.getItem('name'),
                AsyncStorage.getItem('userId'),
                AsyncStorage.getItem('roles'),
            ]);
            dispatch(restoreToken(token ? {
                accessToken: token,
                username: username ?? '',
                name: name ?? '',
                userId: userIdStr ? parseInt(userIdStr) : 0,
                roles: rolesStr ? JSON.parse(rolesStr) : [],
            } : null));
        };
        hydrate();
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        const inAuthGroup = (segments as string[])[0] === '(tabs)';
        if (!accessToken && inAuthGroup) router.replace('/login');
        else if (accessToken && (segments as string[])[0] === 'login') router.replace('/(tabs)');
    }, [accessToken, isInitialized, segments]);

    if (!isInitialized) return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#1e3a8a" />
        </View>
    );

    return <>{children}</>;
}

export default function RootLayout() {
    return (
        <Provider store={store}>
            <FontProvider>
                <AuthGuard>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="login" options={{ animation: 'fade' }} />
                        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    </Stack>
                </AuthGuard>
            </FontProvider>
        </Provider>
    );
}