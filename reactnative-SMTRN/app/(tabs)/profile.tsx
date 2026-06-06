import React, { useState, useEffect } from 'react';
import { Animated, View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScrollView = Animated.ScrollView;
import { Ionicons } from '@expo/vector-icons';
import { logoutUser } from '../../store/authSlice';
import { resetLogs } from '../../store/doseLogSlice';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDispatch, RootState } from '@/store/store';
import { useRouter } from 'expo-router';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';
import {resetDoses} from "@/store/doseSlice";

const Profile = () => {
    const [displayName, setDisplayName] = useState('User');
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const { name: nameFromRedux, roles } = useSelector((s: RootState) => s.auth);

    // profileItems is now built inside the component so it reacts to language changes
    const profileItems: Record<string, { label: string; screen?: string; disabled?: boolean; note?: string }[]> = {
        [t.account]: [
            { label: t.accountInformation, screen: 'accountInformation' },
            { label: t.familyCenter,        screen: 'familyCenter' },
        ],
        [t.general]: [
            { label: t.fontSize,   screen: 'fontSettings' },
            { label: t.display,    screen: 'displaySettings' },
        ],
        [t.support]: [
            { label: t.faq,       screen: 'faq' },
            { label: t.contactUs, screen: 'contactUs' },
        ],
    };

    useEffect(() => {
        if (nameFromRedux) { setDisplayName(nameFromRedux); return; }
        AsyncStorage.getItem('name').then(n => {
            if (n) setDisplayName(n);
            else AsyncStorage.getItem('username').then(u => { if (u) setDisplayName(u); });
        });
    }, [nameFromRedux]);

    const getRoleDisplay = () => {
        if (!roles || roles.length === 0) return t.patient;
        const r = roles[0];
        if (r === 'ROLE_MODERATOR') return t.doctor;
        if (r === 'ROLE_ADMIN')     return t.admin;
        if (r === 'ROLE_USER')      return t.patient;
        return r.replace('ROLE_', '').charAt(0) + r.replace('ROLE_', '').slice(1).toLowerCase();
    };

    const handleLogout = () => {
        Alert.alert(t.logoutTitle, t.logoutMessage, [
            { text: t.cancel, style: 'cancel' },
            {
                text: t.logout, style: 'destructive',
                onPress: () => {
                    dispatch(resetLogs());
                    dispatch(resetDoses());
                    dispatch(logoutUser());
                },
            },
        ]);
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            <View className="px-6 pt-4 pb-6" style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontSize: fs(28) }} className="font-bold text-blue-950">{t.profileTitle}</Text>
            </View>

            {/* Avatar row */}
            <View
                className="flex py-2 flex-row items-center px-6"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
                <View
                    className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center"
                    style={{ marginRight: isRTL ? 0 : 20, marginLeft: isRTL ? 20 : 0 }}
                >
                    <Ionicons name="person" size={48} color="#1e3a8a" />
                </View>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: fs(22) }} className="font-bold text-blue-900">{displayName}</Text>
                    <View className="bg-blue-50 self-start mt-1 px-3 py-0.5 rounded-full">
                        <Text style={{ fontSize: fs(13) }} className="text-blue-700 font-medium">{getRoleDisplay()}</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="mt-6" showsVerticalScrollIndicator={false}>
                {Object.entries(profileItems).map(([category, items]) => (
                    <React.Fragment key={category}>
                        <Text
                            style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }}
                            className="font-bold text-slate-400 mt-6 mb-2 mx-5 uppercase tracking-widest"
                        >
                            {category}
                        </Text>
                        <View className="bg-white border border-slate-200 rounded-[28px] mx-4 overflow-hidden shadow-sm">
                            {items.map((item, index) => (
                                <View key={item.label}>
                                    <TouchableOpacity
                                        className="flex-row justify-between items-center p-4 active:bg-slate-50"
                                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                                        onPress={() => {
                                            if (item.disabled && item.note) Alert.alert(t.comingSoon, item.note);
                                            else if (item.screen) router.push(`/${item.screen}` as any);
                                        }}
                                    >
                                        <View className="flex-1 mr-2" style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                            <Text style={{ fontSize: fs(15) }} className={`font-semibold ${item.disabled ? 'text-slate-400' : 'text-blue-950'}`}>
                                                {item.label}
                                            </Text>
                                        </View>
                                        {item.disabled
                                            ? <Ionicons name="time-outline" size={18} color="#cbd5e1" />
                                            : item.screen
                                                ? <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#cbd5e1" />
                                                : null
                                        }
                                    </TouchableOpacity>
                                    {index < items.length - 1 && (
                                        <View className="items-center">
                                            <View className="h-[1px] bg-slate-100" style={{ width: '85%' }} />
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </React.Fragment>
                ))}

                <View className="mt-8 mb-10 mx-4 bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm">
                    <TouchableOpacity className="flex-row justify-center items-center p-5 active:bg-red-50" onPress={handleLogout}>
                        <Text style={{ fontSize: fs(17) }} className="font-bold text-red-500">{t.logout}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Profile;