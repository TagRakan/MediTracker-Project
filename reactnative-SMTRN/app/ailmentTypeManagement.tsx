import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    Modal, Alert, ActivityIndicator, RefreshControl,
    KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { BackendAilmentType } from '../services/api';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

interface FullAilmentType extends BackendAilmentType {
    isCustom?: boolean;
    isProtected?: boolean;
    user?: { id: number } | null;
}

function TypeBadge({ label, color, bg, fs }: { label: string; color: string; bg: string; fs: (n: number) => number }) {
    return (
        <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
            <Text style={{ fontSize: fs(10), fontWeight: '700', color }}>{label}</Text>
        </View>
    );
}

function AilmentTypeCard({
                             item,
                             onEdit,
                             fs,
                             physicalLabel,
                             mentalLabel,
                             customLabel,
                         }: {
    item: FullAilmentType;
    onEdit: (item: FullAilmentType) => void;
    fs: (n: number) => number;
    physicalLabel: string;
    mentalLabel: string;
    customLabel: string;
}) {
    const canEdit = item.isCustom === true;

    return (
        <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-3 shadow-sm">
            <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                    <Text style={{ fontSize: fs(15) }} className="font-bold text-blue-950 mb-1">
                        {item.name}
                    </Text>

                    <View className="flex-row flex-wrap mb-2" style={{ gap: 6 }}>
                        {item.isPhysical !== undefined && (
                            <TypeBadge
                                label={item.isPhysical ? physicalLabel : mentalLabel}
                                color={item.isPhysical ? '#16a34a' : '#7c3aed'}
                                bg={item.isPhysical ? '#dcfce7' : '#ede9fe'}
                                fs={fs}
                            />
                        )}
                        {item.isCustom && (
                            <TypeBadge label={customLabel} color="#9333ea" bg="#faf5ff" fs={fs} />
                        )}
                    </View>

                    {item.ailmentDescription ? (
                        <Text style={{ fontSize: fs(12) }} className="text-slate-400" numberOfLines={2}>
                            {item.ailmentDescription}
                        </Text>
                    ) : (
                        <Text style={{ fontSize: fs(12) }} className="text-slate-300 italic">—</Text>
                    )}
                </View>

                {canEdit ? (
                    <TouchableOpacity
                        onPress={() => onEdit(item)}
                        activeOpacity={0.7}
                        className="bg-blue-50 w-9 h-9 rounded-xl items-center justify-center"
                    >
                        <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                    </TouchableOpacity>
                ) : (
                    <View className="bg-slate-50 w-9 h-9 rounded-xl items-center justify-center">
                        <Ionicons name="lock-closed-outline" size={15} color="#cbd5e1" />
                    </View>
                )}
            </View>
        </View>
    );
}

interface FormModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    fs: (n: number) => number;
    editTarget?: FullAilmentType;
}

function AilmentTypeFormModal({ visible, onClose, onSuccess, fs, editTarget }: FormModalProps) {
    const { t, isRTL } = useTranslation();
    const isEdit = !!editTarget;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPhysical, setIsPhysical] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            if (isEdit && editTarget) {
                setName(editTarget.name);
                setDescription(editTarget.ailmentDescription ?? '');
                setIsPhysical(editTarget.isPhysical ?? true);
            } else {
                setName('');
                setDescription('');
                setIsPhysical(true);
            }
        }
    }, [visible]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert(t.required, t.ailmentTypeNameRequired);
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                name: name.trim(),
                ailmentDescription: description.trim() || null,
                isCustom: true,
                isProtected: false,
                isPhysical,
            };

            if (isEdit && editTarget) {
                await api.post(`/api/ailment/type/update/${editTarget.id}`, body);
            } else {
                await api.post('/api/ailment/type/add', body);
            }

            onClose();
            onSuccess();
        } catch (e: unknown) {
            const err = e as { response?: { data?: unknown } };
            const msg = typeof err?.response?.data === 'string'
                ? err.response.data
                : t.ailmentTypeSaveFailed;
            Alert.alert(t.error, msg);
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = name.trim().length > 0 && !submitting;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
                    <View className="bg-white rounded-t-[32px] px-6 pt-6" style={{ maxHeight: '92%' }}>
                        <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-5" />

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center justify-between mb-5">
                            <Text style={{ fontSize: fs(22) }} className="font-bold text-blue-950">
                                {isEdit ? t.editType : t.newType}
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
                                {t.ailmentTypeNameLabel}
                            </Text>
                            <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5 flex-row items-center">
                                <Ionicons name="list-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }}
                                    className="flex-1 ml-3 font-medium text-blue-950"
                                    placeholder={t.ailmentTypeNamePlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={name}
                                    onChangeText={setName}
                                    returnKeyType="next"
                                />
                            </View>

                            <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-bold mb-2 uppercase tracking-wider">
                                {t.ailmentTypeDescription}
                            </Text>
                            <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-5">
                                <TextInput
                                    style={{ fontSize: fs(14), minHeight: 80, textAlign: isRTL ? 'right' : 'left' }}
                                    className="font-medium text-blue-950"
                                    placeholder={t.ailmentTypeDescriptionPlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    textAlignVertical="top"
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>

                            <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-bold mb-3 uppercase tracking-wider">
                                {t.ailmentTypeTypeLabel}
                            </Text>
                            <View className="flex-row mb-5" style={{ gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => setIsPhysical(true)}
                                    activeOpacity={0.7}
                                    className="flex-1 rounded-2xl py-3 items-center border"
                                    style={{
                                        backgroundColor: isPhysical ? '#dcfce7' : '#fff',
                                        borderColor: isPhysical ? '#16a34a' : '#e2e8f0',
                                    }}
                                >
                                    <Ionicons name="body-outline" size={20} color={isPhysical ? '#16a34a' : '#94a3b8'} />
                                    <Text style={{ fontSize: fs(12), color: isPhysical ? '#166534' : '#94a3b8', fontWeight: '700', marginTop: 4 }}>
                                        {t.physical}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setIsPhysical(false)}
                                    activeOpacity={0.7}
                                    className="flex-1 rounded-2xl py-3 items-center border"
                                    style={{
                                        backgroundColor: !isPhysical ? '#ede9fe' : '#fff',
                                        borderColor: !isPhysical ? '#7c3aed' : '#e2e8f0',
                                    }}
                                >
                                    <Ionicons name="pulse-outline" size={20} color={!isPhysical ? '#7c3aed' : '#94a3b8'} />
                                    <Text style={{ fontSize: fs(12), color: !isPhysical ? '#5b21b6' : '#94a3b8', fontWeight: '700', marginTop: 4 }}>
                                        {t.mental}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row mt-2" style={{ gap: 12 }}>
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
                                            {isEdit ? t.saveChanges : t.createType}
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

export default function AilmentTypeManagement() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const [types, setTypes] = useState<FullAilmentType[]>([]);
    const [filtered, setFiltered] = useState<FullAilmentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<FullAilmentType | undefined>(undefined);
    const [activeFilter, setActiveFilter] = useState<'all' | 'physical' | 'mental' | 'custom'>('all');

    const fetchTypes = useCallback(async () => {
        setLoading(true);
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
                api.get<FullAilmentType[]>('/api/ailment/type/getall'),
                api.get<FullAilmentType[]>('/api/ailment/type/self/findall'),
            ]);
            if (publicRes.status === 'fulfilled' && Array.isArray(publicRes.value.data)) {
                addItems(publicRes.value.data);
            }
            if (personalRes.status === 'fulfilled' && personalRes.value.status !== 204 && Array.isArray(personalRes.value.data)) {
                addItems(personalRes.value.data);
            }
        } catch {}

        if (collected.length === 0) {
            try {
                const fallback = await api.get<FullAilmentType[]>('/api/protected/ailment/type/findall');
                addItems(Array.isArray(fallback.data) ? fallback.data : []);
            } catch (e: unknown) {
                const err = e as { response?: { data?: unknown } };
                Alert.alert(t.error, typeof err?.response?.data === 'string'
                    ? err.response.data
                    : t.ailmentTypeLoadFailed);
                setLoading(false);
                return;
            }
        }

        collected.sort((a, b) => a.name.localeCompare(b.name));
        setTypes(collected);
        setFiltered(collected);
        setLoading(false);
    }, [t]);

    useEffect(() => { fetchTypes(); }, [fetchTypes]);

    const applyFiltersAndSearch = useCallback((text: string, filter: typeof activeFilter, source: FullAilmentType[]) => {
        let result = source;
        if (text.trim()) {
            result = result.filter(type => type.name.toLowerCase().includes(text.toLowerCase()));
        }
        if (filter === 'physical') result = result.filter(type => type.isPhysical === true);
        else if (filter === 'mental') result = result.filter(type => type.isPhysical === false);
        else if (filter === 'custom') result = result.filter(type => type.isCustom === true);
        setFiltered(result);
    }, []);

    const handleSearch = (text: string) => {
        setSearchText(text);
        applyFiltersAndSearch(text, activeFilter, types);
    };

    const handleFilter = (f: typeof activeFilter) => {
        setActiveFilter(f);
        applyFiltersAndSearch(searchText, f, types);
    };

    const handleOpenAdd = () => {
        setEditTarget(undefined);
        setShowModal(true);
    };

    const handleOpenEdit = (item: FullAilmentType) => {
        if (item.isCustom !== true) return;
        setEditTarget(item);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditTarget(undefined);
    };

    const physicalCount = types.filter(type => type.isPhysical === true).length;
    const mentalCount = types.filter(type => type.isPhysical === false).length;
    const customCount = types.filter(type => type.isCustom === true).length;

    const filterButtons: { key: typeof activeFilter; label: string; count: number; color: string }[] = [
        { key: 'all', label: t.filterAll, count: types.length, color: '#2563eb' },
        { key: 'physical', label: t.physical, count: physicalCount, color: '#16a34a' },
        { key: 'mental', label: t.mental, count: mentalCount, color: '#7c3aed' },
        { key: 'custom', label: t.custom, count: customCount, color: '#9333ea' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="px-6 pt-4 pb-3 items-center justify-between">
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} className="items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4" activeOpacity={0.7}>
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: fs(26), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950">{t.ailmentTypeView}</Text>
                        <Text style={{ fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400">{t.manageAilmentTypes}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleOpenAdd}
                    className="bg-blue-600 px-4 py-2.5 rounded-2xl flex-row items-center"
                    activeOpacity={0.7}
                    style={{ gap: 6 }}
                >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={{ fontSize: fs(13) }} className="text-white font-bold">{t.newTypeBtn}</Text>
                </TouchableOpacity>
            </View>

            <View className="px-6 mb-3">
                <View className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex-row items-center">
                    <Ionicons name="search" size={18} color="#94a3b8" />
                    <TextInput
                        style={{ fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }}
                        className="flex-1 ml-3 font-medium text-blue-950"
                        placeholder={t.searchTypes}
                        placeholderTextColor="#94a3b8"
                        value={searchText}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3"
                contentContainerStyle={{ paddingHorizontal: 24 }}
                style={{ flexGrow: 0 }}
            >
                <View className="flex-row" style={{ gap: 8 }}>
                    {filterButtons.map(btn => {
                        const active = activeFilter === btn.key;
                        return (
                            <TouchableOpacity
                                key={btn.key}
                                onPress={() => handleFilter(btn.key)}
                                activeOpacity={0.7}
                                className="flex-row items-center px-3 py-2 rounded-full border"
                                style={{
                                    backgroundColor: active ? btn.color : '#fff',
                                    borderColor: active ? btn.color : '#e2e8f0',
                                    gap: 5,
                                }}
                            >
                                <Text style={{ fontSize: fs(12), fontWeight: '700', color: active ? '#fff' : '#94a3b8' }}>
                                    {btn.label}
                                </Text>
                                <View style={{
                                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                                    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
                                }}>
                                    <Text style={{ fontSize: fs(10), fontWeight: '800', color: active ? '#fff' : '#64748b' }}>
                                        {btn.count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchTypes} tintColor="#1e3a8a" />
                }
            >
                {loading ? (
                    <View className="items-center justify-center pt-20">
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text style={{ fontSize: fs(14) }} className="text-slate-400 font-medium mt-3">{t.loadingTypes}</Text>
                    </View>
                ) : filtered.length === 0 ? (
                    <View className="items-center justify-center pt-20">
                        <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
                            <Ionicons name="list-outline" size={38} color="#94a3b8" />
                        </View>
                        <Text style={{ fontSize: fs(17) }} className="text-slate-400 font-bold">
                            {searchText || activeFilter !== 'all' ? t.noMatchingTypes : t.noTypesYet}
                        </Text>
                        <Text style={{ fontSize: fs(13) }} className="text-slate-300 mt-1 text-center px-8">
                            {searchText || activeFilter !== 'all'
                                ? t.tryDifferentFilter
                                : t.createFirstType}
                        </Text>
                        {!searchText && activeFilter === 'all' && (
                            <TouchableOpacity
                                onPress={handleOpenAdd}
                                className="mt-6 bg-blue-600 px-6 py-3 rounded-2xl flex-row items-center"
                                activeOpacity={0.7}
                                style={{ gap: 6 }}
                            >
                                <Ionicons name="add" size={16} color="#fff" />
                                <Text style={{ fontSize: fs(14) }} className="text-white font-bold">{t.createFirstTypeBtn}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 font-semibold mb-3">
                            {filtered.length} {filtered.length !== 1 ? t.typesPlural : t.typesSingular}
                            {(searchText || activeFilter !== 'all') ? ` ${t.matched}` : ` ${t.total}`}
                        </Text>
                        {filtered.map(item => (
                            <AilmentTypeCard
                                key={item.id}
                                item={item}
                                onEdit={handleOpenEdit}
                                fs={fs}
                                physicalLabel={t.physical}
                                mentalLabel={t.mental}
                                customLabel={t.custom}
                            />
                        ))}
                    </>
                )}
            </ScrollView>

            <AilmentTypeFormModal
                visible={showModal}
                onClose={handleCloseModal}
                onSuccess={fetchTypes}
                fs={fs}
                editTarget={editTarget}
            />
        </SafeAreaView>
    );
}