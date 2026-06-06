import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

export default function FAQ() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

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
                    {t.faqTitle}
                </Text>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {t.faqItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => setOpenIndex(openIndex === index ? null : index)}
                        activeOpacity={0.7}
                        className={`bg-white border rounded-2xl p-4 mb-3 ${openIndex === index ? 'border-blue-200' : 'border-slate-200'}`}
                    >
                        <View
                            className="flex-row items-center justify-between"
                            style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                        >
                            <Text
                                style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }}
                                className="font-bold text-blue-950 flex-1 mr-2"
                            >
                                {item.q}
                            </Text>
                            <Ionicons
                                name={openIndex === index ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color="#94a3b8"
                            />
                        </View>
                        {openIndex === index && (
                            <Text
                                style={{ fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }}
                                className="text-slate-500 mt-3 leading-5"
                            >
                                {item.a}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}