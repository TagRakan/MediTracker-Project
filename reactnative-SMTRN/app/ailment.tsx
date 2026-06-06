import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    Modal, Alert, ActivityIndicator, RefreshControl,
    KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { BackendAilment, BackendAilmentType, AILMENT_STATUSES, AilmentStatus } from '../services/api';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

const STATUS_COLORS: Record<AilmentStatus, { bg: string; text: string; dot: string }> = {
    ONGOING:    { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#f97316' },
    RECOVERING: { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: '#3b82f6' },
    CURED:      { bg: 'bg-green-100',  text: 'text-green-700',  dot: '#16a34a' },
    CHRONIC:    { bg: 'bg-red-100',    text: 'text-red-700',    dot: '#ef4444' },
};

interface FullAilmentType extends BackendAilmentType {
    isCustom?: boolean;
    isProtected?: boolean;
    user?: { id: number } | null;
}

function AilmentCard({
                         ailment,
                         onRemove,
                         onEdit,
                         fs,
                         statusLabels,
                     }: {
    ailment: BackendAilment;
    onRemove: (a: BackendAilment) => void;
    onEdit: (a: BackendAilment) => void;
    fs: (n: number) => number;
    statusLabels: Record<AilmentStatus, string>;
}) {
    const rawStatus = ailment.ailmentStatus?.name ?? 'ONGOING';
    const statusName: AilmentStatus = (AILMENT_STATUSES as readonly string[]).includes(rawStatus)
        ? (rawStatus as AilmentStatus)
        : 'ONGOING';
    const colors = STATUS_COLORS[statusName];

    return (
        <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                    <View className="flex-row items-center flex-wrap mb-1" style={{ gap: 8 }}>
                        <Text style={{ fontSize: fs(16) }} className="font-bold text-blue-950">
                            {ailment.ailmentName}
                        </Text>
                        <View
                            className={`flex-row items-center px-2 py-0.5 rounded-full ${colors.bg}`}
                            style={{ gap: 4 }}
                        >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
                            <Text style={{ fontSize: fs(10) }} className={`font-bold ${colors.text}`}>
                                {statusLabels[statusName]}
                            </Text>
                        </View>
                    </View>

                    {ailment.ailmentType ? (
                        <View className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
                            <Text style={{ fontSize: fs(13) }} className="text-slate-500 font-medium">
                                {ailment.ailmentType.name}
                            </Text>
                            {(ailment.ailmentType as FullAilmentType).isPhysical !== undefined && (
                                <View className={`px-2 py-0.5 rounded-full ${(ailment.ailmentType as FullAilmentType).isPhysical ? 'bg-green-50' : 'bg-purple-50'}`}>
                                    <Text style={{ fontSize: fs(9) }} className={(ailment.ailmentType as FullAilmentType).isPhysical ? 'text-green-600 font-bold' : 'text-purple-600 font-bold'}>
                                        {(ailment.ailmentType as FullAilmentType).isPhysical ? 'Physical' : 'Mental'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text style={{ fontSize: fs(12) }} className="text-slate-300 italic">—</Text>
                    )}

                    {ailment.ailmentType?.ailmentDescription ? (
                        <Text style={{ fontSize: fs(12) }} className="text-slate-400 mt-1" numberOfLines={2}>
                            {ailment.ailmentType.ailmentDescription}
                        </Text>
                    ) : null}
                </View>

                <View className="flex-col items-center" style={{ gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => onEdit(ailment)}
                        activeOpacity={0.7}
                        className="bg-blue-50 w-9 h-9 rounded-xl items-center justify-center"
                    >
                        <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onRemove(ailment)}
                        activeOpacity={0.7}
                        className="bg-red-50 w-9 h-9 rounded-xl items-center justify-center"
                    >
                        <Ionicons name="trash-outline" size={17} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

interface AilmentFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    fs: (n: number) => number;
    editTarget?: BackendAilment;
}

function AilmentFormModal({ visible, onClose, onSuccess, fs, editTarget }: AilmentFormModalProps) {
    const { t, isRTL } = useTranslation();
    const isEdit = !!editTarget;

    const STATUS_LABELS: Record<AilmentStatus, string> = {
        ONGOING:    t.ailmentStatusOngoing,
        RECOVERING: t.ailmentStatusRecovering,
        CURED:      t.ailmentStatusCured,
        CHRONIC:    t.ailmentStatusChronic,
    };

    const [ailmentName, setAilmentName] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<AilmentStatus>('ONGOING');
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [allTypes, setAllTypes] = useState<FullAilmentType[]>([]);
    const [filteredTypes, setFilteredTypes] = useState<FullAilmentType[]>([]);
    const [typeSearch, setTypeSearch] = useState('');
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [typesError, setTypesError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const extractArray = (data: unknown): FullAilmentType[] => {
        if (Array.isArray(data)) return data;
        return [];
    };

    const fetchTypes = useCallback(async () => {
        setLoadingTypes(true);
        setTypesError(null);
        const seen = new Set<number>();
        const collected: FullAilmentType[] = [];

        const addItems = (items: FullAilmentType[]) => {
            for (const item of items) {
                if (item?.id && !seen.has(item.id)) {
                    seen.add(item.id);
                    collected.push(item);
                }
            }
        };

        try {
            const [publicRes, personalRes] = await Promise.allSettled([
                api.get('/api/ailment/type/getall'),
                api.get('/api/ailment/type/self/findall'),
            ]);
            if (publicRes.status === 'fulfilled') addItems(extractArray(publicRes.value.data));
            if (personalRes.status === 'fulfilled') addItems(extractArray(personalRes.value.data));
        } catch {}

        if (collected.length === 0) {
            const terms = ['a', 'e', 'i', 'o', 'u', 's', 'r', 'n', 't'];
            const results = await Promise.allSettled(
                terms.map(term => api.get(`/api/ailment/type/search/${term}`))
            );
            for (const r of results) {
                if (r.status === 'fulfilled') addItems(extractArray(r.value.data));
            }
            try {
                const personalRes = await api.get('/api/ailment/type/self/findall');
                if (personalRes.status !== 204) addItems(extractArray(personalRes.data));
            } catch {}
        }

        if (collected.length === 0) {
            setTypesError(t.ailmentTypesLoadFailed);
        } else {
            collected.sort((a, b) => a.name.localeCompare(b.name));
            setAllTypes(collected);
            setFilteredTypes(collected);
        }
        setLoadingTypes(false);
    }, [t]);

    useEffect(() => {
        if (visible) {
            if (isEdit && editTarget) {
                setAilmentName(editTarget.ailmentName);
                const rawStatus = editTarget.ailmentStatus?.name ?? 'ONGOING';
                const safeStatus: AilmentStatus = (AILMENT_STATUSES as readonly string[]).includes(rawStatus)
                    ? (rawStatus as AilmentStatus)
                    : 'ONGOING';
                setSelectedStatus(safeStatus);
                setSelectedTypeId(editTarget.ailmentType?.id ?? null);
            } else {
                setAilmentName('');
                setSelectedStatus('ONGOING');
                setSelectedTypeId(null);
            }
            setTypeSearch('');
            setTypesError(null);
            setAllTypes([]);
            setFilteredTypes([]);
            fetchTypes();
        }
    }, [visible]);

    useEffect(() => {
        if (allTypes.length > 0 && isEdit && editTarget?.ailmentType) {
            setSelectedTypeId(editTarget.ailmentType.id);
        }
    }, [allTypes]);

    const handleTypeSearch = (text: string) => {
        setTypeSearch(text);
        setFilteredTypes(
            !text.trim() ? allTypes : allTypes.filter(type => type.name.toLowerCase().includes(text.toLowerCase()))
        );
    };

    const handleSubmit = async () => {
        if (!ailmentName.trim()) {
            Alert.alert(t.required, t.ailmentNameRequired);
            return;
        }

        if (selectedTypeId === null) {
            Alert.alert(t.ailmentTypeRequired, t.ailmentTypeRequiredDesc);
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                ailmentName: ailmentName.trim(),
                ailmentStatus: selectedStatus,
                ailmentType: selectedTypeId,
            };

            if (isEdit && editTarget) {
                await api.post(`/api/ailment/self/update/${editTarget.id}`, body);
            } else {
                await api.post('/api/ailment/self/add', body);
            }

            onClose();
            onSuccess();
        } catch (e: unknown) {
            const err = e as { response?: { data?: unknown } };
            const msg = typeof err?.response?.data === 'string'
                ? err.response.data
                : t.ailmentSaveFailed;
            Alert.alert(t.error, msg as string);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedTypeName = allTypes.find(type => type.id === selectedTypeId)?.name;

    const canSubmit =
        ailmentName.trim().length > 0 &&
        !submitting &&
        !loadingTypes &&
        selectedTypeId !== null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
                    <View className="bg-white rounded-t-[32px] px-6 pt-6" style={{ maxHeight: '93%' }}>
                        <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-5" />

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center justify-between mb-5">
                            <Text style={{ fontSize: fs(22) }} className="font-bold text-blue-950">
                                {isEdit ? t.editCondition : t.addCondition}
                            </Text>
                            <TouchableOpacity
                                onPress={() => { onClose(); Keyboard.dismiss(); }}
                                className="bg-slate-100 w-9 h-9 rounded-full items-center justify-center"
                            >
                                <Ionicons name="close" size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-bold mb-2 uppercase tracking-wider">
                                {t.ailmentConditionName}
                            </Text>
                            <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
                                <Ionicons name="thermometer-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }}
                                    className="flex-1 ml-3 font-medium text-blue-950"
                                    placeholder={t.ailmentConditionPlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={ailmentName}
                                    onChangeText={setAilmentName}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>

                            <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-bold mb-2 uppercase tracking-wider">
                                {t.ailmentStatus}
                            </Text>
                            <View className="mb-5">
                                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                                    {AILMENT_STATUSES.map(s => {
                                        const isSelected = selectedStatus === s;
                                        return (
                                            <TouchableOpacity
                                                key={s}
                                                onPress={() => setSelectedStatus(s)}
                                                activeOpacity={0.6}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 8,
                                                    borderRadius: 999,
                                                    borderWidth: 1,
                                                    backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                                                    borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: fs(13),
                                                        fontWeight: '600',
                                                        color: isSelected ? '#ffffff' : '#172554',
                                                    }}
                                                >
                                                    {STATUS_LABELS[s]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center justify-between mb-2">
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-bold uppercase tracking-wider">
                                        {t.ailmentTypeLabel}
                                    </Text>
                                    <View className="bg-red-100 px-2 py-0.5 rounded-full">
                                        <Text style={{ fontSize: fs(9) }} className="text-red-500 font-bold">
                                            {t.required ?? 'Required'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }} className="items-center">
                                    {loadingTypes && <ActivityIndicator size="small" color="#1e3a8a" />}
                                    <TouchableOpacity onPress={fetchTypes} disabled={loadingTypes} activeOpacity={0.7}>
                                        <Ionicons name="refresh-outline" size={16} color={loadingTypes ? '#cbd5e1' : '#94a3b8'} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {typesError ? (
                                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex-row items-start">
                                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" style={{ marginTop: 2 }} />
                                    <View className="flex-1 ml-2">
                                        <Text style={{ fontSize: fs(12) }} className="text-red-600">{typesError}</Text>
                                        <TouchableOpacity onPress={fetchTypes} className="mt-1">
                                            <Text style={{ fontSize: fs(12) }} className="text-red-500 font-bold">{t.tapToRetry}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : null}

                            <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-3 flex-row items-center">
                                <Ionicons name="search" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={{ fontSize: fs(14), textAlign: isRTL ? 'right' : 'left' }}
                                    className="flex-1 font-medium text-blue-950"
                                    placeholder={t.filterTypes}
                                    placeholderTextColor="#94a3b8"
                                    value={typeSearch}
                                    onChangeText={handleTypeSearch}
                                    returnKeyType="done"
                                />
                                {typeSearch.length > 0 && (
                                    <TouchableOpacity onPress={() => { setTypeSearch(''); setFilteredTypes(allTypes); }}>
                                        <Ionicons name="close-circle" size={16} color="#cbd5e1" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={{ maxHeight: 200 }}>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled
                                    keyboardShouldPersistTaps="always"
                                >
                                    {loadingTypes ? (
                                        <View className="items-center py-8">
                                            <ActivityIndicator size="large" color="#1e3a8a" />
                                            <Text style={{ fontSize: fs(13) }} className="text-slate-400 mt-2">{t.loadingTypes}</Text>
                                        </View>
                                    ) : filteredTypes.length === 0 ? (
                                        <View className="items-center py-6">
                                            <Ionicons name="search-outline" size={28} color="#cbd5e1" />
                                            <Text style={{ fontSize: fs(13) }} className="text-slate-400 text-center mt-2">
                                                {allTypes.length === 0 ? t.noTypesLoaded : t.noMatchingTypes}
                                            </Text>
                                        </View>
                                    ) : (
                                        filteredTypes.map(type => (
                                            <TouchableOpacity
                                                key={type.id}
                                                onPress={() => { setSelectedTypeId(type.id); Keyboard.dismiss(); }}
                                                activeOpacity={0.7}
                                                className={`px-4 py-3 rounded-xl mb-2 border ${
                                                    selectedTypeId === type.id
                                                        ? 'bg-blue-50 border-blue-300'
                                                        : 'bg-white border-slate-200'
                                                }`}
                                            >
                                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center justify-between">
                                                    <Text
                                                        style={{ fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }}
                                                        className={`font-semibold flex-1 ${selectedTypeId === type.id ? 'text-blue-700' : 'text-blue-950'}`}
                                                    >
                                                        {type.name}
                                                    </Text>
                                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                                                        {type.isCustom && selectedTypeId !== type.id && (
                                                            <View className="bg-purple-50 px-2 py-0.5 rounded-full">
                                                                <Text style={{ fontSize: fs(9) }} className="text-purple-600 font-bold">{t.custom}</Text>
                                                            </View>
                                                        )}
                                                        {selectedTypeId === type.id && (
                                                            <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                                                        )}
                                                    </View>
                                                </View>
                                                {type.ailmentDescription ? (
                                                    <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 mt-0.5" numberOfLines={1}>
                                                        {type.ailmentDescription}
                                                    </Text>
                                                ) : null}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                            </View>

                            {selectedTypeId !== null && (
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center mt-2 mb-1 bg-blue-50 px-3 py-2 rounded-xl">
                                    <Ionicons name="checkmark-circle" size={14} color="#2563eb" />
                                    <Text style={{ fontSize: fs(12) }} className="text-blue-600 font-bold ml-1">
                                        {t.selected}: {selectedTypeName}
                                    </Text>
                                </View>
                            )}

                            {/*{!loadingTypes && allTypes.length > 0 && selectedTypeId === null && (
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center mt-2 mb-1 bg-orange-50 px-3 py-2 rounded-xl">
                                    <Ionicons name="alert-circle-outline" size={13} color="#f97316" />
                                    <Text style={{ fontSize: fs(11) }} className="text-orange-500 font-semibold ml-1">
                                        {t.ailmentTypeRequiredDesc ?? 'Please select a type to continue'}
                                    </Text>
                                </View>
                            )}*/}

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }} className="mt-4">
                                <TouchableOpacity
                                    onPress={() => { onClose(); Keyboard.dismiss(); }}
                                    activeOpacity={0.7}
                                    className="flex-1 bg-slate-100 rounded-2xl py-4 items-center"
                                    disabled={submitting}
                                >
                                    <Text style={{ fontSize: fs(15) }} className="text-slate-500 font-bold">{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={!canSubmit}
                                    activeOpacity={0.7}
                                    className="flex-1 bg-blue-600 rounded-2xl py-4 items-center"
                                    style={{ opacity: canSubmit ? 1 : 0.5 }}
                                >
                                    {submitting
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={{ fontSize: fs(15) }} className="text-white font-bold">
                                            {isEdit ? t.saveChanges : t.addCondition}
                                        </Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default function AilmentPage() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const STATUS_LABELS: Record<AilmentStatus, string> = {
        ONGOING:    t.ailmentStatusOngoing,
        RECOVERING: t.ailmentStatusRecovering,
        CURED:      t.ailmentStatusCured,
        CHRONIC:    t.ailmentStatusChronic,
    };

    const [ailments, setAilments] = useState<BackendAilment[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<BackendAilment | undefined>(undefined);

    const fetchAilments = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await api.get<BackendAilment[]>('/api/ailment/self/get');
            setAilments(Array.isArray(res.data) ? res.data : []);
        } catch (e: unknown) {
            const err = e as { response?: { data?: unknown } };
            Alert.alert(t.error, typeof err?.response?.data === 'string' ? err.response.data : t.ailmentLoadFailed);
        } finally {
            setLoadingList(false);
        }
    }, [t]);

    useEffect(() => { fetchAilments(); }, []);

    const handleOpenAdd = () => {
        setEditTarget(undefined);
        setShowModal(true);
    };

    const handleOpenEdit = (ailment: BackendAilment) => {
        setEditTarget(ailment);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditTarget(undefined);
    };

    const handleRemove = (ailment: BackendAilment) => {
        const doDelete = async () => {
            try {
                await api.delete(`/api/ailment/self/delete/${ailment.id}`);
                setAilments(prev => prev.filter(a => a.id !== ailment.id));
            } catch (e: unknown) {
                const err = e as { response?: { data?: unknown } };
                Alert.alert(t.error, typeof err?.response?.data === 'string' ? err.response.data : t.ailmentDeleteFailed);
            }
        };

        Alert.alert(t.removeCondition, t.removeConditionConfirm(ailment.ailmentName), [
            { text: t.cancel, style: 'cancel' },
            { text: t.remove, style: 'destructive', onPress: doDelete },
        ]);
    };

    const statusCounts = ailments.reduce<Record<string, number>>((acc, a) => {
        const s = a.ailmentStatus?.name ?? 'ONGOING';
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="px-6 pt-4 pb-4 items-center justify-between">
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4" activeOpacity={0.7}>
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: fs(28), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950">{t.ailments}</Text>
                        <Text style={{ fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400">{t.yourTrackedConditions}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleOpenAdd}
                    className="bg-blue-600 px-4 py-2.5 rounded-2xl flex-row items-center"
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={{ fontSize: fs(13) }} className="text-white font-bold ml-1">{t.add}</Text>
                </TouchableOpacity>
            </View>

            {ailments.length > 0 && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="mx-6 mb-3 bg-white border border-slate-100 rounded-2xl px-3 py-3 items-center">
                    {(['ONGOING', 'CHRONIC', 'RECOVERING', 'CURED'] as AilmentStatus[]).map((s, i, arr) => (
                        <View
                            key={s}
                            className={`flex-1 items-center ${i < arr.length - 1 ? 'border-r border-slate-100' : ''}`}
                        >
                            <Text style={{ fontSize: fs(17), color: STATUS_COLORS[s].dot }} className="font-black">
                                {statusCounts[s] ?? 0}
                            </Text>
                            <Text style={{ fontSize: fs(9) }} className="text-slate-400 font-semibold uppercase tracking-wide mt-0.5">
                                {STATUS_LABELS[s]}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={
                    <RefreshControl refreshing={loadingList} onRefresh={fetchAilments} tintColor="#1e3a8a" />
                }
            >
                {loadingList ? (
                    <View className="items-center justify-center pt-20">
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text style={{ fontSize: fs(14) }} className="text-slate-400 font-medium mt-3">{t.loadingConditions}</Text>
                    </View>
                ) : ailments.length === 0 ? (
                    <View className="items-center justify-center pt-20">
                        <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
                            <Ionicons name="thermometer-outline" size={38} color="#94a3b8" />
                        </View>
                        <Text style={{ fontSize: fs(17) }} className="text-slate-400 font-bold">{t.noConditionsTracked}</Text>
                        <Text style={{ fontSize: fs(13) }} className="text-slate-300 mt-1 text-center px-8">
                            {t.noConditionsDesc}
                        </Text>
                        <TouchableOpacity
                            onPress={handleOpenAdd}
                            className="mt-6 bg-blue-600 px-6 py-3 rounded-2xl flex-row items-center"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={{ fontSize: fs(14) }} className="text-white font-bold ml-1.5">{t.addFirstCondition}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    ailments.map(ailment => (
                        <AilmentCard
                            key={ailment.id}
                            ailment={ailment}
                            onRemove={handleRemove}
                            onEdit={handleOpenEdit}
                            fs={fs}
                            statusLabels={STATUS_LABELS}
                        />
                    ))
                )}
            </ScrollView>

            <AilmentFormModal
                visible={showModal}
                onClose={handleCloseModal}
                onSuccess={fetchAilments}
                fs={fs}
                editTarget={editTarget}
            />
        </SafeAreaView>
    );
}