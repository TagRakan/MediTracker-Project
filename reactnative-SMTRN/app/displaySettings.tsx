import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { changeLanguage, Language } from '../store/languageSlice';
import { useTranslation } from '../context/useTranslation';
import { useFontScale } from '../context/FontContext';

const LANGUAGES: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
    { code: 'en', label: 'English',  nativeLabel: 'English',  flag: '🇬🇧' },
    { code: 'ar', label: 'Arabic',   nativeLabel: 'العربية',  flag: '🇸🇦' },
];

export default function DisplaySettings() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { t, isRTL, language } = useTranslation();
    const { fs } = useFontScale();

    const handleSelect = (code: Language) => {
        dispatch(changeLanguage(code));
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            {/* Header */}
            <View
                className="px-6 pt-4 pb-4 flex-row items-center"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-4"
                    style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
                >
                    <Ionicons
                        name={isRTL ? 'arrow-forward' : 'arrow-back'}
                        size={28}
                        color="#172554"
                    />
                </TouchableOpacity>
                <Text style={{ fontSize: fs(28) }} className="font-bold text-blue-950">
                    {t.displaySettings}
                </Text>
            </View>

            <View className="px-6 mt-4">
                {/* Section label */}
                <Text
                    style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }}
                    className="font-bold text-slate-400 mb-3 uppercase tracking-widest"
                >
                    {t.language}
                </Text>

                {/* Language cards */}
                <View className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm">
                    {LANGUAGES.map((lang, index) => {
                        const isSelected = language === lang.code;
                        return (
                            <View key={lang.code}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => handleSelect(lang.code)}
                                    className={`px-5 py-4 flex-row items-center justify-between ${isSelected ? 'bg-blue-50' : ''}`}
                                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                                >
                                    {/* Left: flag + labels */}
                                    <View
                                        className="flex-row items-center"
                                        style={{
                                            flexDirection: isRTL ? 'row-reverse' : 'row',
                                            gap: 14,
                                        }}
                                    >
                                        <View className="w-12 h-12 bg-slate-100 rounded-2xl items-center justify-center">
                                            <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                                        </View>
                                        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                            <Text
                                                style={{ fontSize: fs(16) }}
                                                className={`font-bold ${isSelected ? 'text-blue-800' : 'text-blue-950'}`}
                                            >
                                                {lang.nativeLabel}
                                            </Text>
                                            <Text
                                                style={{ fontSize: fs(12) }}
                                                className="text-slate-400 mt-0.5"
                                            >
                                                {lang.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Right: checkmark or empty circle */}
                                    {isSelected ? (
                                        <View className="w-7 h-7 bg-blue-600 rounded-full items-center justify-center">
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                        </View>
                                    ) : (
                                        <View className="w-7 h-7 border-2 border-slate-200 rounded-full" />
                                    )}
                                </TouchableOpacity>

                                {index < LANGUAGES.length - 1 && (
                                    <View className="items-center">
                                        <View className="h-[1px] bg-slate-100" style={{ width: '85%' }} />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Info note */}
                <View
                    className="flex-row items-start mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3"
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }}
                >
                    <Ionicons name="information-circle-outline" size={18} color="#3b82f6" style={{ marginTop: 1 }} />
                    <Text
                        style={{ fontSize: fs(12), textAlign: isRTL ? 'right' : 'left', flex: 1 }}
                        className="text-blue-700 leading-5"
                    >
                        {language === 'ar'
                            ? 'ستُطبَّق اللغة المختارة فوراً على جميع صفحات التطبيق.'
                            : 'The selected language applies instantly across all app screens.'}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}