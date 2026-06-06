import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

type FontScale = 'small' | 'default' | 'large' | 'xlarge';

export default function FontSettings() {
    const router = useRouter();
    const { fontScale, setFontScale, fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const FONT_OPTIONS: { labelKey: keyof typeof t; descKey: keyof typeof t; value: FontScale; size: number }[] = [
        { labelKey: 'fontSmall',   descKey: 'fontSmallDesc',   value: 'small',   size: 13 },
        { labelKey: 'fontDefault', descKey: 'fontDefaultDesc', value: 'default', size: 16 },
        { labelKey: 'fontLarge',   descKey: 'fontLargeDesc',   value: 'large',   size: 19 },
        { labelKey: 'fontXLarge',  descKey: 'fontXLargeDesc',  value: 'xlarge',  size: 23 },
    ];

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View
                className="px-6 pt-4 pb-6 flex-row items-center"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <Text style={{ fontSize: fs(28) }} className="font-bold text-blue-950">
                    {t.fontSettingsTitle}
                </Text>
            </View>

            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
                {/* Preview */}
                <Text
                    style={{ fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }}
                    className="text-slate-400 font-semibold uppercase tracking-wider mb-3"
                >
                    {t.fontPreviewLabel}
                </Text>
                <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
                    <Text style={{ fontSize: fs(22), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950 mb-1">
                        {t.fontPreviewTitle}
                    </Text>
                    <Text style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-500 leading-6">
                        {t.fontPreviewBody}
                    </Text>
                    <View
                        className="flex-row items-center mt-4"
                        style={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        <View className="bg-blue-600 px-4 py-2 rounded-full">
                            <Text style={{ fontSize: fs(13) }} className="text-white font-bold">{t.fontPreviewTake}</Text>
                        </View>
                        <View className="bg-slate-100 px-4 py-2 rounded-full">
                            <Text style={{ fontSize: fs(13) }} className="text-slate-500 font-bold">{t.fontPreviewSkip}</Text>
                        </View>
                    </View>
                </View>

                {/* Options */}
                <Text
                    style={{ fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }}
                    className="text-slate-400 font-semibold uppercase tracking-wider mb-3"
                >
                    {t.fontSelectLabel}
                </Text>

                {FONT_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        onPress={() => setFontScale(option.value)}
                        activeOpacity={0.7}
                        className={`flex-row items-center rounded-2xl p-4 mb-3 border ${
                            fontScale === option.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        <View className="flex-1" style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                            <Text
                                style={{ fontSize: option.size }}
                                className={`font-bold ${fontScale === option.value ? 'text-blue-700' : 'text-blue-950'}`}
                            >
                                {t[option.labelKey] as string}
                            </Text>
                            <Text style={{ fontSize: fs(12) }} className="text-slate-400 mt-0.5">
                                {t[option.descKey] as string}
                            </Text>
                        </View>
                        {fontScale === option.value && (
                            <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                        )}
                    </TouchableOpacity>
                ))}

                <View
                    className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-2 mb-10 flex-row items-start"
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                >
                    <Ionicons name="information-circle-outline" size={18} color="#1e3a8a" style={{ marginTop: 2 }} />
                    <Text
                        style={{
                            fontSize: fs(13),
                            marginLeft: isRTL ? 0 : 12,
                            marginRight: isRTL ? 12 : 0,
                            flex: 1,
                            lineHeight: 20,
                            textAlign: isRTL ? 'right' : 'left',
                        }}
                        className="text-blue-800"
                    >
                        {t.fontNote}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}