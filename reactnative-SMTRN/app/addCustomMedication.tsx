import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, {
    INGESTION_METHODS, EFFECTS, SIDE_EFFECTS, RESTRICTIONS,
} from '../services/api';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

type ToggleGroupProps = {
    label: string;
    sublabel?: string;
    optional?: boolean;
    optionalLabel: string;
    selectOneLabel: string;
    options: readonly string[];
    labelMap: Record<string, string>;
    selected: string[];
    onToggle: (value: string) => void;
    fs: (n: number) => number;
    isRTL: boolean;
};

function ToggleGroup({ label, sublabel, optional, optionalLabel, selectOneLabel, options, labelMap, selected, onToggle, fs, isRTL }: ToggleGroupProps) {
    const noneSelected = selected.length === 0;
    return (
        <View className="mb-5">
            <View className="flex-row items-center mb-1" style={{ gap: 6, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-slate-400 uppercase tracking-wider">{label}</Text>
                {optional && (
                    <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                        <Text style={{ fontSize: fs(9) }} className="text-slate-400 font-semibold">{optionalLabel}</Text>
                    </View>
                )}
            </View>
            {sublabel && (
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 mb-2">{sublabel}</Text>
            )}
            <View className="flex-row flex-wrap" style={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {options.map(opt => {
                    const active = selected.includes(opt);
                    return (
                        <TouchableOpacity
                            key={opt}
                            onPress={() => onToggle(opt)}
                            activeOpacity={0.7}
                            className={`px-4 py-2 rounded-full border ${
                                active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                            }`}
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
            {!optional && noneSelected && (
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-red-400 mt-1">{selectOneLabel}</Text>
            )}
        </View>
    );
}

function toggle(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

function buildDisplayString(keys: string[], labelMap: Record<string, string>): string {
    return keys
        .filter(k => k.toUpperCase() !== 'NONE')
        .map(k => labelMap[k] ?? k)
        .join(', ');
}

const AddCustomMedication = () => {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const methodLabels: Record<string, string> = {
        ORAL: t.cmMethodOral,
        TRANSDERMAL: t.cmMethodTransdermal,
        RECTAL: t.cmMethodRectal,
        INTERMUSCULAR_INJECTION: t.cmMethodIM,
        INTERVENOUS_INJECTION: t.cmMethodIV,
        TRANSNASAL: t.cmMethodTransnasal,
        INHALATION: t.cmMethodInhalation,
    };

    const effectLabels: Record<string, string> = {
        PAIN_NUMBING: t.cmEffectPainNumbing,
        ANTI_FUNGAL: t.cmEffectAntiFungal,
        ANTI_BACTERIAL: t.cmEffectAntiBacterial,
        ANTI_VIRAL: t.cmEffectAntiViral,
        RELAXANT: t.cmEffectRelaxant,
        STIMULANT: t.cmEffectStimulant,
        BP_REGULATOR: t.cmEffectBpRegulator,
    };

    const sideEffectLabels: Record<string, string> = {
        NAUSEA: t.cmSENausea,
        DROWSINESS: t.cmSEDrowsiness,
        HEADACHE: t.cmSEHeadache,
        UPSET_STOMACH: t.cmSEUpsetStomach,
        INCREASED_HEARTBEAT: t.cmSEHeartbeat,
    };

    const restrictionLabels: Record<string, string> = {
        AFTER_EATING: t.cmRestAfterEating,
        BEFORE_EATING: t.cmRestBeforeEating,
        NON_PREGNANT_ONLY: t.cmRestNonPregnant,
    };

    const [name, setName] = useState('');
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
    const [selectedSideEffects, setSelectedSideEffects] = useState<string[]>([]);
    const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const nameValid = name.trim().length >= 5 && name.trim().length <= 30;
    const canProceed = nameValid;

    const handleSubmit = async () => {
        if (!nameValid) {
            Alert.alert(t.cmNameRequired, t.cmNameRequiredDesc);
            return;
        }

        setLoading(true);
        try {
            const trimmedName = name.trim();

            const body = {
                name: trimmedName,
                isProtected: false,
                isCustom: true,
                ingestionMethods: selectedMethods.length > 0 ? selectedMethods : ['NONE'],
                effects: selectedEffects.length > 0 ? selectedEffects : ['NONE'],
                sideEffects: selectedSideEffects.length > 0 ? selectedSideEffects : ['NONE'],
                restrictions: selectedRestrictions.length > 0 ? selectedRestrictions : ['NONE'],
            };

            await api.post('/api/medication/custom/add', body);

            let medicineId: number | null = null;
            try {
                const selfRes = await api.get('/api/medication/self/findall');
                if (Array.isArray(selfRes.data)) {
                    const matches = selfRes.data.filter((m: any) =>
                        m.name?.toLowerCase() === trimmedName.toLowerCase()
                    );
                    if (matches.length > 0) {
                        medicineId = matches[matches.length - 1].id;
                    }
                }
            } catch { }

            const doseDisplay   = buildDisplayString(selectedRestrictions, restrictionLabels);
            const methodDisplay = buildDisplayString(selectedMethods,      methodLabels);
            const effectsDisplay= buildDisplayString(selectedEffects,      effectLabels);

            if (medicineId) {
                router.replace({
                    pathname: '/medication/[id]',
                    params: {
                        id: String(medicineId),
                        name: trimmedName,
                        dose: doseDisplay,
                        method: methodDisplay,
                        effects: effectsDisplay,
                    },
                });
            } else {
                Alert.alert(
                    t.cmCreatedTitle,
                    t.cmCreatedDesc(trimmedName),
                    [{ text: 'OK', onPress: () => router.replace('/(tabs)/doses') }]
                );
            }
        } catch (e: any) {
            const msg =
                typeof e?.response?.data === 'string'
                    ? e.response.data
                    : JSON.stringify(e?.response?.data) ?? t.cmFailedGeneric;
            Alert.alert(t.cmFailedTitle, msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className="px-6 pt-4 pb-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <Text style={{ fontSize: fs(26) }} className="font-bold text-blue-950">{t.cmTitle}</Text>
            </View>

            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    {t.cmNameLabel}
                </Text>
                <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 mb-2">{t.cmNameHint}</Text>
                <View className={`border rounded-2xl px-4 py-3 mb-1 flex-row items-center ${
                    name.length > 0 && !nameValid ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
                }`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Ionicons name="medical-outline" size={20} color="#1e3a8a" />
                    <TextInput
                        style={{ fontSize: fs(15), marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, textAlign: isRTL ? 'right' : 'left' }}
                        className="flex-1 font-medium text-blue-950"
                        placeholder={t.cmNamePlaceholder}
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
                        {name.trim().length < 5 ? t.cmNameTooShort : t.cmNameTooLong}
                    </Text>
                )}
                <View className="mb-5" />

                <ToggleGroup
                    label={t.cmLabelMethod}
                    optional
                    optionalLabel={t.cmOptional}
                    selectOneLabel={t.cmSelectOne}
                    options={INGESTION_METHODS}
                    labelMap={methodLabels}
                    selected={selectedMethods}
                    onToggle={val => setSelectedMethods(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />

                <ToggleGroup
                    label={t.cmLabelEffects}
                    optional
                    sublabel={t.cmSubEffects}
                    optionalLabel={t.cmOptional}
                    selectOneLabel={t.cmSelectOne}
                    options={EFFECTS}
                    labelMap={effectLabels}
                    selected={selectedEffects}
                    onToggle={val => setSelectedEffects(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />

                <ToggleGroup
                    label={t.cmLabelSideEffects}
                    optional
                    sublabel={t.cmSubSideEffects}
                    optionalLabel={t.cmOptional}
                    selectOneLabel={t.cmSelectOne}
                    options={SIDE_EFFECTS}
                    labelMap={sideEffectLabels}
                    selected={selectedSideEffects}
                    onToggle={val => setSelectedSideEffects(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />

                <ToggleGroup
                    label={t.cmLabelRestrictions}
                    optional
                    sublabel={t.cmSubRestrictions}
                    optionalLabel={t.cmOptional}
                    selectOneLabel={t.cmSelectOne}
                    options={RESTRICTIONS}
                    labelMap={restrictionLabels}
                    selected={selectedRestrictions}
                    onToggle={val => setSelectedRestrictions(prev => toggle(prev, val))}
                    fs={fs}
                    isRTL={isRTL}
                />

                <TouchableOpacity
                    onPress={handleSubmit}
                    activeOpacity={0.7}
                    disabled={loading || !canProceed}
                    className="bg-blue-600 rounded-2xl py-4 items-center mb-6"
                    style={{ opacity: canProceed && !loading ? 1 : 0.5 }}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={{ fontSize: fs(16) }} className="text-white font-bold">{t.cmSubmit}</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AddCustomMedication;