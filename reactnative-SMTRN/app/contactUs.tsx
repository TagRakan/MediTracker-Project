import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

export default function ContactUs() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();



    const [topic, setTopic] = useState<string>(t.topics[0]);
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');

    const handleSend = () => {
        if (!message.trim()) {
            Alert.alert(t.emptyMessage, t.emptyMessageDesc);
            return;
        }
        Alert.alert(t.messageSent, t.messageSentDesc, [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    // @ts-ignore
    // @ts-ignore
    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                    <Text style={{ fontSize: fs(26) }} className="font-bold text-blue-950">
                        {t.contactUsTitle}
                    </Text>
                </View>

                <ScrollView
                    className="flex-1 px-6"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* Email banner */}
                    <View
                        className="bg-blue-50 rounded-[24px] p-5 mb-6 flex-row items-center"
                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        <Ionicons name="mail-outline" size={28} color="#1e3a8a" />
                        <View
                            className="flex-1"
                            style={{ marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}
                        >
                            <Text style={{ fontSize: fs(14) }} className="text-blue-950 font-bold">{t.contactEmail}</Text>
                            <Text style={{ fontSize: fs(12) }} className="text-blue-700/60">{t.contactReply}</Text>
                        </View>
                    </View>

                    {/* Topic */}
                    <Text
                        style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }}
                        className="text-slate-400 font-bold mb-2 uppercase tracking-wider"
                    >
                        {t.topicLabel}
                    </Text>
                    <View
                        className="flex-row flex-wrap mb-5"
                        style={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        {t.topics.map((tp: string) => (
                            <TouchableOpacity
                                key={tp}
                                onPress={() => setTopic(tp)}
                                activeOpacity={0.7}
                                className={`px-4 py-2 rounded-full border ${topic === tp ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
                            >
                                <Text style={{ fontSize: fs(13) }} className={`font-semibold ${topic === tp ? 'text-white' : 'text-blue-950'}`}>
                                    {tp}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Email input */}
                    <Text
                        style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }}
                        className="text-slate-400 font-bold mb-2 uppercase tracking-wider"
                    >
                        {t.emailLabel}
                    </Text>
                    <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5">
                        <TextInput
                            style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }}
                            className="font-medium text-blue-950"
                            placeholder="your@email.com"
                            placeholderTextColor="#94a3b8"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCorrect={false}
                            returnKeyType="next"
                        />
                    </View>

                    {/* Message input */}
                    <Text
                        style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }}
                        className="text-slate-400 font-bold mb-2 uppercase tracking-wider"
                    >
                        {t.messageLabel}
                    </Text>
                    <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-8">
                        <TextInput
                            style={{ fontSize: fs(15), minHeight: 120, textAlign: isRTL ? 'right' : 'left' }}
                            className="font-medium text-blue-950"
                            placeholder={t.messagePlaceholder}
                            placeholderTextColor="#94a3b8"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity onPress={handleSend} activeOpacity={0.7} className="bg-blue-900 rounded-2xl py-4 items-center mb-10">
                        <Text style={{ fontSize: fs(16) }} className="text-white font-bold">{t.sendMessage}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}