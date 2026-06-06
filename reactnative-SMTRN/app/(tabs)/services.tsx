import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchUnreadMessages } from '../../store/messageSlice';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';

export default function Services() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();
    const dispatch = useDispatch<AppDispatch>();
    const { unreadCount } = useSelector((s: RootState) => s.messages);
    const roles = useSelector((s: RootState) => s.auth.roles);
    const isModerator = roles.includes('ROLE_MODERATOR') || roles.includes('ROLE_ADMIN');

    const SERVICES = [
        { id: 1, name: t.familyCenter,                        icon: 'people-outline',      route: '/familyCenter',             desc: t.manageFamily,     modOnly: false },
        { id: 2, name: t.doctorCenter ?? 'Doctor Center',     icon: 'medkit-outline',      route: '/doctorCenter',             desc: t.manageDoctors,    modOnly: false },
        { id: 3, name: t.ailments ?? 'Ailments',              icon: 'thermometer-outline', route: '/ailment',                  desc: t.trackConditions,  modOnly: false },
        { id: 4, name: t.customMeds ?? 'Custom Meds',         icon: 'flask-outline',       route: '/addCustomMedication',      desc: t.createMedication, modOnly: false },
        { id: 5, name: t.history,                              icon: 'time-outline',        route: '/history',                  desc: t.yourPastDoses,    modOnly: false },
        { id: 6, name: t.ailmentTypeView,                        icon: 'list-outline',        route: '/ailmentTypeManagement',    desc: t.manageAilmentTypes, modOnly: false },
        { id: 7, name: t.patients,                             icon: 'person-add-outline',  route: '/patients',                 desc: t.doctorView,       modOnly: true  },
    ];



    useEffect(() => { dispatch(fetchUnreadMessages()); }, [dispatch]);

    const needsFiller = SERVICES.length % 2 !== 0;

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View
                className="px-6 pt-4 pb-6 flex-row items-center justify-between"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
                <Text style={{ fontSize: fs(28) }} className="font-bold text-blue-950 tracking-tight">
                    {t.servicesTitle}
                </Text>
                {unreadCount > 0 && (
                    <View
                        className="flex-row items-center bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-full"
                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        <Ionicons name="notifications-outline" size={14} color="#ea580c" />
                        <Text
                            style={{
                                fontSize: fs(12),
                                marginLeft: isRTL ? 0 : 4,
                                marginRight: isRTL ? 4 : 0,
                                color: '#ea580c',
                                fontWeight: 'bold',
                            }}
                        >
                            {unreadCount} {t.newNotif}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-between">
                    {SERVICES.map(item => {
                        const locked = item.modOnly && !isModerator;

                        if (locked) {
                            return (
                                <View
                                    key={item.id}
                                    className="w-[48%] h-44 rounded-[32px] mb-4 items-center justify-center overflow-hidden"
                                    style={{
                                        borderWidth: 1.5,
                                        borderColor: '#cbd5e1',
                                        borderStyle: 'dashed',
                                        backgroundColor: '#f8fafc',
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 14,
                                            backgroundColor: '#f1f5f9',
                                            borderWidth: 1,
                                            borderColor: '#e2e8f0',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: 10,
                                        }}
                                    >
                                        <Ionicons name={item.icon as any} size={20} color="#94a3b8" />
                                    </View>
                                    <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '700' }}>
                                        {item.name}
                                    </Text>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: 6,
                                            backgroundColor: '#f1f5f9',
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 999,
                                            gap: 4,
                                        }}
                                    >
                                        <Ionicons name="lock-closed-outline" size={10} color="#94a3b8" />
                                        <Text style={{ fontSize: fs(10), color: '#94a3b8', fontWeight: '600' }}>
                                            {t.doctorOnly}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.7}
                                onPress={() => router.push(item.route as any)}
                                className="bg-white w-[48%] h-44 rounded-[32px] p-6 mb-4 border border-slate-200 shadow-sm items-center justify-center"
                            >
                                <View className="w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center mb-4">
                                    <Ionicons name={item.icon as any} size={28} color="#1e3a8a" />
                                </View>
                                <Text style={{ fontSize: fs(15) }} className="text-blue-950 font-bold text-center leading-tight">
                                    {item.name}
                                </Text>
                                <Text style={{ fontSize: fs(11) }} className="text-slate-400 mt-1">
                                    {item.desc}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {needsFiller && (
                        <View className="w-[48%] h-44 rounded-[32px] border border-dashed border-slate-200 items-center justify-center">
                            <Ionicons name="add" size={24} color="#cbd5e1" />
                            <Text style={{ fontSize: fs(13) }} className="text-slate-300 font-bold mt-1">
                                {t.moreSoon}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}