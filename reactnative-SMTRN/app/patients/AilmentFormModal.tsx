import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    Modal, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AILMENT_STATUSES, AilmentStatus, BackendAilment, BackendAilmentType } from '../../services/api';
import api from '../../services/api';
import { useTranslation } from '../../context/useTranslation';

interface FullAilmentType extends BackendAilmentType {
    isCustom?: boolean;
    isProtected?: boolean;
    isPhysical?: boolean;
}

interface AilmentFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: number;
    fs: (n: number) => number;
    editTarget?: BackendAilment;
}

export function AilmentFormModal({ visible, onClose, onSuccess, patientId, fs, editTarget }: AilmentFormModalProps) {
    const { t, isRTL } = useTranslation();
    const isEdit = !!editTarget;

    const STATUS_LABELS: Record<AilmentStatus, string> = {
        ONGOING:    t.ailmentStatusOngoing,
        RECOVERING: t.ailmentStatusRecovering,
        CURED:      t.ailmentStatusCured,
        CHRONIC:    t.ailmentStatusChronic,
    };

    const STATUS_COLORS: Record<AilmentStatus, { bg: string; text: string; dot: string; border: string }> = {
        ONGOING:    { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', border: '#fed7aa' },
        RECOVERING: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', border: '#bfdbfe' },
        CURED:      { bg: '#f0fdf4', text: '#15803d', dot: '#16a34a', border: '#bbf7d0' },
        CHRONIC:    { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', border: '#fecaca' },
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
            const [protectedRes, publicRes] = await Promise.allSettled([
                api.get('/api/protected/ailment/type/findall'),
                api.get('/api/ailment/type/getall'),
            ]);
            if (protectedRes.status === 'fulfilled') addItems(extractArray(protectedRes.value.data));
            if (publicRes.status === 'fulfilled') addItems(extractArray(publicRes.value.data));
        } catch {}

        if (collected.length === 0) {
            const terms = ['a', 'e', 'i', 'o', 'u', 's', 'r', 'n', 't'];
            const results = await Promise.allSettled(
                terms.map(term => api.get(`/api/ailment/type/search/${term}`))
            );
            for (const r of results) {
                if (r.status === 'fulfilled') addItems(extractArray(r.value.data));
            }
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
                setSelectedStatus((editTarget.ailmentStatus?.name ?? 'ONGOING') as AilmentStatus);
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
                await api.put(`/api/protected/ailment/users/update/${patientId}/${editTarget.id}`, body);
            } else {
                await api.post(`/api/protected/ailment/users/add/${patientId}`, body);
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
    const selectedTypeItem = allTypes.find(type => type.id === selectedTypeId);

    const canSubmit = ailmentName.trim().length > 0 && !submitting && !loadingTypes && selectedTypeId !== null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 24, maxHeight: '93%' }}>

                        <View style={{ width: 48, height: 4, backgroundColor: '#e2e8f0', borderRadius: 999, alignSelf: 'center', marginBottom: 20 }} />

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: fs(22), fontWeight: 'bold', color: '#172554' }}>
                                {isEdit ? t.editCondition : t.addCondition}
                            </Text>
                            <TouchableOpacity
                                onPress={() => { onClose(); Keyboard.dismiss(); }}
                                style={{ backgroundColor: '#f1f5f9', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="close" size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                {t.ailmentConditionName}
                            </Text>
                            <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                <Ionicons name="thermometer-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={{ fontSize: fs(15), flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontWeight: '500', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}
                                    placeholder={t.ailmentConditionPlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={ailmentName}
                                    onChangeText={setAilmentName}
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>

                            <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                {t.ailmentStatus}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {AILMENT_STATUSES.map(s => {
                                    const isSelected = selectedStatus === s;
                                    const colors = STATUS_COLORS[s];
                                    return (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => setSelectedStatus(s)}
                                            activeOpacity={0.6}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                                borderRadius: 999,
                                                borderWidth: 1,
                                                backgroundColor: isSelected ? colors.bg : '#ffffff',
                                                borderColor: isSelected ? colors.border : '#e2e8f0',
                                                gap: 5,
                                            }}
                                        >
                                            {isSelected && (
                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dot }} />
                                            )}
                                            <Text style={{ fontSize: fs(13), fontWeight: '600', color: isSelected ? colors.text : '#172554' }}>
                                                {STATUS_LABELS[s]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {t.ailmentTypeLabel}
                                    </Text>
                                    <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                                        <Text style={{ fontSize: fs(9), color: '#ef4444', fontWeight: 'bold' }}>{t.required}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={fetchTypes} disabled={loadingTypes} activeOpacity={0.7}>
                                    {loadingTypes
                                        ? <ActivityIndicator size="small" color="#94a3b8" />
                                        : <Ionicons name="refresh-outline" size={16} color="#94a3b8" />
                                    }
                                </TouchableOpacity>
                            </View>

                            {typesError ? (
                                <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" style={{ marginTop: 2 }} />
                                    <View style={{ flex: 1, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                                        <Text style={{ fontSize: fs(12), color: '#dc2626', textAlign: isRTL ? 'right' : 'left' }}>{typesError}</Text>
                                        <TouchableOpacity onPress={fetchTypes} style={{ marginTop: 4 }}>
                                            <Text style={{ fontSize: fs(12), color: '#ef4444', fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>{t.tapToRetry}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : null}

                            <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                <Ionicons name="search" size={14} color="#94a3b8" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                                <TextInput
                                    style={{ fontSize: fs(14), flex: 1, fontWeight: '500', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}
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
                                <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="always">
                                    {loadingTypes ? (
                                        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                                            <ActivityIndicator size="large" color="#1e3a8a" />
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', marginTop: 8 }}>{t.loadingTypes}</Text>
                                        </View>
                                    ) : filteredTypes.length === 0 ? (
                                        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                            <Ionicons name="search-outline" size={28} color="#cbd5e1" />
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                                                {allTypes.length === 0 ? t.noTypesLoaded : t.noMatchingTypes}
                                            </Text>
                                        </View>
                                    ) : (
                                        filteredTypes.map(type => (
                                            <TouchableOpacity
                                                key={type.id}
                                                onPress={() => { setSelectedTypeId(type.id); Keyboard.dismiss(); }}
                                                activeOpacity={0.7}
                                                style={{
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 12,
                                                    borderRadius: 12,
                                                    marginBottom: 6,
                                                    borderWidth: 1,
                                                    backgroundColor: selectedTypeId === type.id ? '#eff6ff' : '#fff',
                                                    borderColor: selectedTypeId === type.id ? '#93c5fd' : '#e2e8f0',
                                                }}
                                            >
                                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: fs(13), fontWeight: '600', flex: 1, color: selectedTypeId === type.id ? '#1d4ed8' : '#172554', textAlign: isRTL ? 'right' : 'left' }}>
                                                        {type.name}
                                                    </Text>
                                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                                                        {type.isCustom && selectedTypeId !== type.id && (
                                                            <View style={{ backgroundColor: '#faf5ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                                                                <Text style={{ fontSize: fs(9), color: '#9333ea', fontWeight: 'bold' }}>{t.custom}</Text>
                                                            </View>
                                                        )}
                                                        {type.isPhysical !== undefined && selectedTypeId !== type.id && (
                                                            <View style={{ backgroundColor: type.isPhysical ? '#dcfce7' : '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                                                                <Text style={{ fontSize: fs(9), fontWeight: 'bold', color: type.isPhysical ? '#16a34a' : '#7c3aed' }}>
                                                                    {type.isPhysical ? t.physical : t.mental}
                                                                </Text>
                                                            </View>
                                                        )}
                                                        {selectedTypeId === type.id && (
                                                            <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                                                        )}
                                                    </View>
                                                </View>
                                                {type.ailmentDescription ? (
                                                    <Text style={{ fontSize: fs(11), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                                                        {type.ailmentDescription}
                                                    </Text>
                                                ) : null}
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </ScrollView>
                            </View>

                            {selectedTypeId !== null && (
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 8, marginBottom: 4, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#2563eb" />
                                    <Text style={{ fontSize: fs(12), color: '#1d4ed8', fontWeight: 'bold', flex: 1, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                                        {t.selected}: {selectedTypeName}
                                    </Text>
                                    {selectedTypeItem?.isPhysical !== undefined && (
                                        <View style={{ backgroundColor: selectedTypeItem.isPhysical ? '#dcfce7' : '#ede9fe', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}>
                                            <Text style={{ fontSize: fs(9), fontWeight: 'bold', color: selectedTypeItem.isPhysical ? '#16a34a' : '#7c3aed' }}>
                                                {selectedTypeItem.isPhysical ? t.physical : t.mental}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 20 }}>
                                <TouchableOpacity
                                    onPress={() => { onClose(); Keyboard.dismiss(); }}
                                    activeOpacity={0.7}
                                    style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
                                    disabled={submitting}
                                >
                                    <Text style={{ fontSize: fs(15), color: '#64748b', fontWeight: 'bold' }}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={!canSubmit}
                                    activeOpacity={0.7}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#2563eb',
                                        borderRadius: 16,
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                        opacity: canSubmit ? 1 : 0.5,
                                    }}
                                >
                                    {submitting
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={{ fontSize: fs(15), color: '#fff', fontWeight: 'bold' }}>
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