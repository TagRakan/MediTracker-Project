import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api, {
    BackendMedicine, INGESTION_METHODS, EFFECTS, SIDE_EFFECTS, RESTRICTIONS,
} from '../services/api';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

const METHOD_LABELS_EN: Record<string, string> = {
    ORAL: 'Oral',
    TRANSDERMAL: 'Transdermal',
    RECTAL: 'Rectal',
    INTERMUSCULAR_INJECTION: 'IM Injection',
    INTERVENOUS_INJECTION: 'IV Injection',
    TRANSNASAL: 'Transnasal',
    INHALATION: 'Inhalation',
};

const METHOD_LABELS_AR: Record<string, string> = {
    ORAL: 'فموي',
    TRANSDERMAL: 'عبر الجلد',
    RECTAL: 'شرجي',
    INTERMUSCULAR_INJECTION: 'حقن عضلي',
    INTERVENOUS_INJECTION: 'حقن وريدي',
    TRANSNASAL: 'أنفي',
    INHALATION: 'استنشاق',
};

const EFFECT_LABELS_EN: Record<string, string> = {
    PAIN_NUMBING: 'Pain Numbing',
    ANTI_FUNGAL: 'Anti-Fungal',
    ANTI_BACTERIAL: 'Anti-Bacterial',
    ANTI_VIRAL: 'Anti-Viral',
    RELAXANT: 'Relaxant',
    STIMULANT: 'Stimulant',
    BP_REGULATOR: 'BP Regulator',
};

const EFFECT_LABELS_AR: Record<string, string> = {
    PAIN_NUMBING: 'مسكّن للألم',
    ANTI_FUNGAL: 'مضاد للفطريات',
    ANTI_BACTERIAL: 'مضاد للبكتيريا',
    ANTI_VIRAL: 'مضاد للفيروسات',
    RELAXANT: 'مرخٍ',
    STIMULANT: 'منبّه',
    BP_REGULATOR: 'منظّم ضغط الدم',
};

const SIDE_EFFECT_LABELS_EN: Record<string, string> = {
    NAUSEA: 'Nausea',
    DROWSINESS: 'Drowsiness',
    HEADACHE: 'Headache',
    UPSET_STOMACH: 'Upset Stomach',
    INCREASED_HEARTBEAT: 'Increased Heartbeat',
};

const SIDE_EFFECT_LABELS_AR: Record<string, string> = {
    NAUSEA: 'غثيان',
    DROWSINESS: 'نعاس',
    HEADACHE: 'صداع',
    UPSET_STOMACH: 'اضطراب المعدة',
    INCREASED_HEARTBEAT: 'تسارع ضربات القلب',
};

const RESTRICTION_LABELS_EN: Record<string, string> = {
    AFTER_EATING: 'After Eating',
    BEFORE_EATING: 'Before Eating',
    NON_PREGNANT_ONLY: 'Non-Pregnant Only',
};

const RESTRICTION_LABELS_AR: Record<string, string> = {
    AFTER_EATING: 'بعد الأكل',
    BEFORE_EATING: 'قبل الأكل',
    NON_PREGNANT_ONLY: 'للغير حوامل فقط',
};

type ToggleGroupProps = {
    label: string;
    options: readonly string[];
    labelMap: Record<string, string>;
    selected: string[];
    onToggle: (value: string) => void;
    fs: (n: number) => number;
    isRTL: boolean;
};

function ToggleGroup({ label, options, labelMap, selected, onToggle, fs, isRTL }: ToggleGroupProps) {
    return (
        <View className="mb-5">
            <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-slate-400 uppercase tracking-wider mb-2">
                {label}
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {options.map(opt => {
                    const active = selected.includes(opt);
                    return (
                        <TouchableOpacity
                            key={opt}
                            onPress={() => onToggle(opt)}
                            activeOpacity={0.7}
                            className={`px-4 py-2 rounded-full border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
                        >
                            <Text
                                style={{ fontSize: fs(13) }}
                                className={`font-semibold ${active ? 'text-white' : 'text-blue-950'}`}
                            >
                                {labelMap[opt] ?? opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function toggle(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

export default function EditCustomMedication() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL, language } = useTranslation();
    const { id, name: paramName } = useLocalSearchParams<{ id: string; name?: string }>();

    const [loadingInitial, setLoadingInitial] = useState(true);
    const [name, setName] = useState(paramName ?? '');
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
    const [selectedSideEffects, setSelectedSideEffects] = useState<string[]>([]);
    const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const nameValid = name.trim().length >= 5 && name.trim().length <= 30;

    const methodLabels = language === 'ar' ? METHOD_LABELS_AR : METHOD_LABELS_EN;
    const effectLabels = language === 'ar' ? EFFECT_LABELS_AR : EFFECT_LABELS_EN;
    const sideEffectLabels = language === 'ar' ? SIDE_EFFECT_LABELS_AR : SIDE_EFFECT_LABELS_EN;
    const restrictionLabels = language === 'ar' ? RESTRICTION_LABELS_AR : RESTRICTION_LABELS_EN;

    useEffect(() => {
        if (!id) { setLoadingInitial(false); return; }
        api.get<BackendMedicine>(`/api/medication/getMedicationById/${id}`)
            .then(res => {
                const m = res.data;
                setName(m.name ?? '');
                setSelectedMethods(
                    (m.ingestionMethods ?? [])
                        .map(x => x.name)
                        .filter(n => n !== 'NONE')
                );
                setSelectedEffects(
                    (m.effects ?? [])
                        .map(x => x.name)
                        .filter(n => n !== 'NONE')
                );
                setSelectedSideEffects(
                    (m.sideEffects ?? [])
                        .map(x => x.name)
                        .filter(n => n !== 'NONE')
                );
                setSelectedRestrictions(
                    (m.restrictions ?? [])
                        .map(x => x.name)
                        .filter(n => n !== 'NONE')
                );
            })
            .catch(() => {
                Alert.alert(t.error, t.ecmLoadError);
            })
            .finally(() => setLoadingInitial(false));
    }, [id]);

    const handleSave = async () => {
        if (!nameValid) {
            Alert.alert(t.ecmNameRequired, t.ecmNameRequiredDesc);
            return;
        }
        if (!id) return;

        setSaving(true);
        try {
            const body = {
                name: name.trim(),
                isProtected: false,
                isCustom: true,
                ingestionMethods: selectedMethods.length > 0 ? selectedMethods : ['NONE'],
                effects: selectedEffects.length > 0 ? selectedEffects : ['NONE'],
                sideEffects: selectedSideEffects.length > 0 ? selectedSideEffects : ['NONE'],
                restrictions: selectedRestrictions.length > 0 ? selectedRestrictions : ['NONE'],
            };
            await api.put(`/api/medication/updateMedication/${id}`, body);
            Alert.alert(t.ecmSavedTitle, t.ecmSavedDesc(name.trim()), [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            const msg =
                typeof e?.response?.data === 'string'
                    ? e.response.data
                    : t.ecmSaveFailed;
            Alert.alert(t.error, msg);
        } finally {
            setSaving(false);
        }
    };

    if (loadingInitial) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text className="text-slate-400 mt-3">{t.ecmLoading}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className="px-6 pt-4 pb-4 flex-row items-center justify-between" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} disabled={saving}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <Text style={{ fontSize: fs(20), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950 flex-1 ml-4">
                    {t.ecmTitle}
                </Text>
                <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.7}
                    disabled={saving || !nameValid}
                    className="bg-blue-600 px-4 py-2 rounded-2xl"
                    style={{ opacity: nameValid && !saving ? 1 : 0.5 }}
                >
                    {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={{ fontSize: fs(14) }} className="text-white font-bold">{t.editDoseSave}</Text>
                    }
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    {t.ecmNameLabel}
                </Text>
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 mb-2">{t.ecmNameHint}</Text>
                <View className={`border rounded-2xl px-4 py-3 mb-1 flex-row items-center ${
                    name.length > 0 && !nameValid ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
                }`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Ionicons name="medical-outline" size={20} color="#1e3a8a" />
                    <TextInput
                        style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }}
                        className="flex-1 ml-3 font-medium text-blue-950"
                        placeholder={t.ecmNamePlaceholder}
                        placeholderTextColor="#94a3b8"
                        value={name}
                        onChangeText={setName}
                        autoCorrect={false}
                        maxLength={30}
                    />
                    <Text style={{ fontSize: fs(11) }} className="text-slate-300">{name.length}/30</Text>
                </View>
                {name.length > 0 && !nameValid && (
                    <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-red-400 mb-2 ml-1">
                        {name.trim().length < 5 ? t.ecmNameTooShort : t.ecmNameTooLong}
                    </Text>
                )}
                <View className="mb-5" />

                <ToggleGroup
                    label={t.ecmLabelMethod}
                    options={INGESTION_METHODS}
                    labelMap={methodLabels}
                    selected={selectedMethods}
                    onToggle={val => setSelectedMethods(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />
                <ToggleGroup
                    label={t.ecmLabelEffects}
                    options={EFFECTS}
                    labelMap={effectLabels}
                    selected={selectedEffects}
                    onToggle={val => setSelectedEffects(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />
                <ToggleGroup
                    label={t.ecmLabelSideEffects}
                    options={SIDE_EFFECTS}
                    labelMap={sideEffectLabels}
                    selected={selectedSideEffects}
                    onToggle={val => setSelectedSideEffects(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />
                <ToggleGroup
                    label={t.ecmLabelRestrictions}
                    options={RESTRICTIONS}
                    labelMap={restrictionLabels}
                    selected={selectedRestrictions}
                    onToggle={val => setSelectedRestrictions(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />
            </ScrollView>
        </SafeAreaView>
    );
}