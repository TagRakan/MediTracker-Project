import {
    View, Text, TouchableOpacity, FlatList, TextInput,
    TouchableWithoutFeedback, Keyboard, useWindowDimensions,
    ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import api, { BackendMedicine } from '../../services/api';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';

interface MedItem {
    id: string;
    name: string;
    restrictions: string;
    method: string;
    effects: string;
    isCustom: boolean;
}

function filterNone(values: string[]): string[] {
    return values.filter(v => v.toLowerCase() !== 'none');
}

function mapMedicine(m: BackendMedicine): MedItem {
    const restrictions = filterNone(
        m.restrictions?.map(r => r.name.replace(/_/g, ' ')) ?? []
    ).join(', ');

    const rawMethods = filterNone(
        m.ingestionMethods?.map(x => x.name.replace(/_/g, ' ')) ?? []
    );
    const method = rawMethods[0] ?? '';

    const effects = filterNone(
        m.effects?.map(e => e.name.replace(/_/g, ' ')) ?? []
    ).join(', ');

    return {
        id: String(m.id),
        name: m.name,
        restrictions,
        method,
        effects,
        isCustom: m.isCustom ?? false,
    };
}

const AddMedication = () => {
    const router = useRouter();
    const { height } = useWindowDimensions();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const [allMedications, setAllMedications] = useState<MedItem[]>([]);
    const [medications, setMedications] = useState<MedItem[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const inputRef = useRef<TextInput>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let globalMeds: BackendMedicine[] = [];
            try {
                const res = await api.get<BackendMedicine[]>('/api/medication/findall');
                if (Array.isArray(res.data)) {
                    globalMeds = res.data.filter(m => !m.isCustom);
                }
            } catch {
                const terms = ['a', 'e', 'i', 'o', 'u'];
                const results = await Promise.all(
                    terms.map(term =>
                        api.get<BackendMedicine[]>(`/api/medication/searchMedicationByName/${term}`)
                            .then(r => r.data)
                            .catch(() => [] as BackendMedicine[])
                    )
                );
                const flat = results.flat();
                const seen = new Set<number>();
                globalMeds = flat.filter(m => {
                    if (seen.has(m.id)) return false;
                    seen.add(m.id);
                    return true;
                });
            }

            let customMeds: BackendMedicine[] = [];
            try {
                const selfRes = await api.get<BackendMedicine[]>('/api/medication/self/findall');
                if (selfRes.status !== 204 && Array.isArray(selfRes.data)) {
                    customMeds = selfRes.data;
                }
            } catch {
            }

            const seen = new Set<number>(customMeds.map(m => m.id));
            const combined: BackendMedicine[] = [
                ...customMeds,
                ...globalMeds.filter(m => !seen.has(m.id)),
            ];

            if (combined.length === 0) {
                setError(t.addMedLoadError);
            }

            const mapped = combined.map(mapMedicine);
            setAllMedications(mapped);
            setMedications(mapped);
        } catch {
            setError(t.addMedLoadError);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchAll(); }, []);

    const searchMedications = useCallback(async (term: string) => {
        if (!term.trim()) {
            setMedications(allMedications);
            setCurrentPage(1);
            return;
        }
        const localMatch = allMedications.filter(m =>
            m.name.toLowerCase().includes(term.toLowerCase())
        );
        setMedications(localMatch);
        setCurrentPage(1);

        setLoading(true);
        try {
            const res = await api.get<BackendMedicine[]>(
                `/api/medication/searchMedicationByName/${encodeURIComponent(term.trim())}`
            );
            const mapped = res.data.map(mapMedicine);
            const seen = new Set<string>(mapped.map(m => m.id));
            const merged = [
                ...mapped,
                ...localMatch.filter(m => !seen.has(m.id)),
            ];
            setMedications(merged);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [allMedications]);

    const handleSearchChange = (text: string) => {
        setSearchText(text);
        setCurrentPage(1);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => searchMedications(text), 300);
    };

    const handleClear = () => {
        setSearchText('');
        setMedications(allMedications);
        setCurrentPage(1);
    };

    const handleDeleteCustomMed = useCallback((item: MedItem) => {
        Alert.alert(
            t.addMedDeleteTitle,
            t.addMedDeleteConfirm(item.name),
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.addMedDelete,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/medication/deleteMedication/${item.id}`);
                            setAllMedications(prev => prev.filter(m => m.id !== item.id));
                            setMedications(prev => prev.filter(m => m.id !== item.id));
                        } catch (e: any) {
                            Alert.alert(
                                t.error,
                                typeof e?.response?.data === 'string'
                                    ? e.response.data
                                    : t.addMedDeleteFailed
                            );
                        }
                    },
                },
            ]
        );
    }, [t]);

    const handleEditCustomMed = useCallback((item: MedItem) => {
        router.push({
            pathname: '/editCustomMedication' as any,
            params: { id: item.id, name: item.name },
        });
    }, [router]);

    const handleMedActions = useCallback((item: MedItem) => {
        if (!item.isCustom) {
            handleSelectMed(item);
            return;
        }
        Alert.alert(
            item.name,
            t.addMedActionsPrompt,
            [
                {
                    text: t.addMedScheduleDose,
                    onPress: () => handleSelectMed(item),
                },
                {
                    text: t.addMedEdit,
                    onPress: () => handleEditCustomMed(item),
                },
                {
                    text: t.addMedDelete,
                    style: 'destructive',
                    onPress: () => handleDeleteCustomMed(item),
                },
                { text: t.cancel, style: 'cancel' },
            ]
        );
    }, [t, handleDeleteCustomMed, handleEditCustomMed]);

    const medicationsPerPage = useMemo(
        () => Math.max(1, Math.floor((height * 0.52) / 90)),
        [height]
    );

    const totalPages = Math.ceil(medications.length / medicationsPerPage);

    const currentMedications = useMemo(() => {
        const start = (currentPage - 1) * medicationsPerPage;
        return medications.slice(start, start + medicationsPerPage);
    }, [medications, currentPage, medicationsPerPage]);

    const handleSelectMed = (item: MedItem) => {
        router.push({
            pathname: '/medication/[id]' as any,
            params: {
                id: item.id,
                name: item.name,
                dose: item.restrictions,
                method: item.method,
                effects: item.effects,
            },
        });
    };

    const renderMedItem = ({ item }: { item: MedItem }) => (
        <TouchableOpacity
            className="flex-row justify-between items-center rounded-2xl p-4 mb-3 border border-slate-200 bg-white"
            activeOpacity={0.7}
            onPress={() => item.isCustom ? handleMedActions(item) : handleSelectMed(item)}
            onLongPress={() => item.isCustom ? handleMedActions(item) : undefined}
            style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
            <View className="flex-1">
                <View className="flex-row items-center flex-wrap" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Text style={{ fontSize: fs(16), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950 mr-1.5">{item.name}</Text>
                    {!!item.method && (
                        <Text style={{ fontSize: fs(10) }} className="font-medium text-blue-600/40 uppercase">{item.method}</Text>
                    )}
                    {item.isCustom && (
                        <View className="ml-2 bg-purple-50 px-2 py-0.5 rounded-full">
                            <Text style={{ fontSize: fs(10) }} className="text-purple-600 font-bold">{t.custom}</Text>
                        </View>
                    )}
                </View>
                {!!item.effects && (
                    <Text style={{ fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-500 font-medium" numberOfLines={1}>{item.effects}</Text>
                )}
                {!!item.restrictions && (
                    <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400" numberOfLines={1}>{item.restrictions}</Text>
                )}
            </View>

            <View className="flex-row items-center" style={{ gap: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {item.isCustom && (
                    <>
                        <TouchableOpacity
                            onPress={() => handleEditCustomMed(item)}
                            activeOpacity={0.7}
                            className="w-8 h-8 bg-blue-50 rounded-xl items-center justify-center"
                            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                            <Ionicons name="pencil-outline" size={14} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleDeleteCustomMed(item)}
                            activeOpacity={0.7}
                            className="w-8 h-8 bg-red-50 rounded-xl items-center justify-center"
                            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        >
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                    </>
                )}
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
            <SafeAreaView className="flex-1 bg-slate-50">
                <View className="px-6 pt-4 pb-4 flex-row items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <TouchableOpacity onPress={() => router.replace('/(tabs)/doses' as any)} className="mr-4">
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: fs(26), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950">{t.addMedTitle}</Text>
                </View>

                <View className="flex-row items-center justify-end px-6 pb-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <TouchableOpacity
                        className="bg-blue-600 px-4 py-2.5 rounded-2xl shadow-sm"
                        activeOpacity={0.7}
                        onPress={() => router.push('/addCustomMedication' as any)}
                    >
                        <Text style={{ fontSize: fs(14) }} className="text-white font-bold">{t.addMedCustomBtn}</Text>
                    </TouchableOpacity>
                </View>

                <View className="px-6 pb-4">
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => inputRef.current?.focus()}
                        className="flex-row items-center bg-white px-4 py-4 rounded-3xl border border-slate-200 shadow-sm"
                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        {loading
                            ? <ActivityIndicator size="small" color="#1e3a8a" />
                            : <Ionicons name="search" size={20} color="#1e3a8a" />
                        }
                        <TextInput
                            ref={inputRef}
                            style={{ fontSize: fs(16), textAlign: isRTL ? 'right' : 'left' }}
                            className="flex-1 ml-3 font-medium text-blue-950 p-0 leading-6"
                            placeholder={t.addMedSearchPlaceholder}
                            placeholderTextColor="#94a3b8"
                            value={searchText}
                            onChangeText={handleSearchChange}
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={handleClear} className="ml-2">
                                <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>

                {!loading && medications.length > 0 && (
                    <View className="px-6 pb-2">
                        <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-medium">
                            {t.addMedFoundCount(medications.length)}
                            {medications.some(m => m.isCustom) ? ` · ${t.addMedCustomHint}` : ''}
                        </Text>
                    </View>
                )}

                <View style={{ flex: 1 }} className="px-6">
                    {loading && medications.length === 0 ? (
                        <View className="items-center justify-center pt-10">
                            <ActivityIndicator size="large" color="#1e3a8a" />
                            <Text style={{ fontSize: fs(14) }} className="text-slate-400 font-medium mt-3">{t.addMedLoading}</Text>
                        </View>
                    ) : error ? (
                        <View className="items-center justify-center pt-10">
                            <Ionicons name="cloud-offline-outline" size={40} color="#cbd5e1" />
                            <Text style={{ fontSize: fs(14) }} className="text-slate-400 font-medium mt-3 text-center">{error}</Text>
                            <TouchableOpacity onPress={fetchAll} className="mt-4 bg-blue-600 px-6 py-2 rounded-full">
                                <Text style={{ fontSize: fs(13) }} className="text-white font-bold">{t.retry}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : medications.length === 0 ? (
                        <View className="items-center justify-center pt-10">
                            <Ionicons name="search-outline" size={40} color="#cbd5e1" />
                            <Text style={{ fontSize: fs(14) }} className="text-slate-400 font-medium mt-3">{t.addMedNotFound}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={currentMedications}
                            renderItem={renderMedItem}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>

                {totalPages > 1 && (
                    <View className="flex-row justify-center py-4 flex-wrap" style={{ gap: 6 }}>
                        {Array.from({ length: totalPages }).map((_, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => setCurrentPage(index + 1)}
                                className={`px-4 py-2 rounded-full ${currentPage === index + 1 ? 'bg-blue-500' : 'bg-slate-200'}`}
                            >
                                <Text style={{ fontSize: fs(13) }} className={currentPage === index + 1 ? 'text-white font-bold' : 'text-blue-900'}>
                                    {index + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

export default AddMedication;