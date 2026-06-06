import React, { useCallback, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Alert,
    ActivityIndicator, RefreshControl, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { RootState, AppDispatch } from '../../store/store';
import { fetchDoses } from '../../store/doseSlice';
import { BackendDose, DayOfWeek, ALL_DAYS } from '../../services/api';
import { parseBackendTime, formatTime } from '../utils/doseHelpers';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';
import api from '../../services/api';

const DAY_SHORT: Record<string, string> = {
    MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
    FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

const DAY_SHORT_AR: Record<string, string> = {
    MONDAY: 'الإث', TUESDAY: 'الثل', WEDNESDAY: 'الأر', THURSDAY: 'الخم',
    FRIDAY: 'الجم', SATURDAY: 'السب', SUNDAY: 'الأح',
};

interface MedCluster {
    medName: string;
    medId: string;
    isCustom: boolean;
    prescribedByDoctor: boolean;
    addedByName?: string;
    startDate?: string;
    endDate?: string;
    clusters: {
        identifier: string;
        doses: BackendDose[];
    }[];
}

function buildMedTree(doses: BackendDose[], userId: number | undefined): MedCluster[] {
    const active = doses.filter(d => d.isActive !== false);
    const byMed: Record<string, {
        medName: string; medId: string; isCustom: boolean;
        prescribedByDoctor: boolean; addedByName?: string;
        startDate?: string; endDate?: string;
        byIdentifier: Record<string, BackendDose[]>;
    }> = {};

    active.forEach(dose => {
        const medId = String(dose.medicine?.id ?? 'unknown');
        const medName = dose.medicine?.name ?? dose.name;
        if (!byMed[medId]) {
            byMed[medId] = {
                medName, medId,
                isCustom: dose.medicine?.isCustom ?? false,
                prescribedByDoctor: !!dose.addedBy && dose.addedBy.id !== userId,
                addedByName: dose.addedBy?.name,
                startDate: dose.startDate,
                endDate: dose.endDate,
                byIdentifier: {},
            };
        }
        const identifier = dose.doseSimpleIdentifier ?? 'default';
        if (!byMed[medId].byIdentifier[identifier]) byMed[medId].byIdentifier[identifier] = [];
        byMed[medId].byIdentifier[identifier].push(dose);
    });

    return Object.values(byMed).map(med => ({
        medName: med.medName,
        medId: med.medId,
        isCustom: med.isCustom,
        prescribedByDoctor: med.prescribedByDoctor,
        addedByName: med.addedByName,
        startDate: med.startDate,
        endDate: med.endDate,
        clusters: Object.entries(med.byIdentifier).map(([identifier, ds]) => ({ identifier, doses: ds })),
    }));
}

function timeToDate(hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

function dateToTimeString(d: Date): string {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:00`;
}

interface EditState {
    dose: BackendDose;
    selectedDay: DayOfWeek;
    time: Date;
    tempTime: Date;
    amountMg: number;
    showTimePicker: boolean;
    saving: boolean;
}

function EditDoseModal({ editState, onClose, onSave, onDayChange, onAmountChange, onOpenTimePicker, onTimeChange, onConfirmIOSTime, fs, t, isRTL, dayShort }: {
    editState: EditState;
    onClose: () => void;
    onSave: () => void;
    onDayChange: (d: DayOfWeek) => void;
    onAmountChange: (delta: number) => void;
    onOpenTimePicker: () => void;
    onTimeChange: (_: DateTimePickerEvent, d?: Date) => void;
    onConfirmIOSTime: () => void;
    fs: (n: number) => number;
    t: any;
    isRTL: boolean;
    dayShort: Record<string, string>;
}) {
    const { dose, selectedDay, time, tempTime, amountMg, showTimePicker, saving } = editState;

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: '#f8fafc', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                        <TouchableOpacity onPress={onClose} disabled={saving}>
                            <Text style={{ fontSize: fs(16), color: '#64748b', fontWeight: '600' }}>{t.editDoseCancel}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: fs(17), color: '#172554', fontWeight: '700' }}>{t.editDoseTitle}</Text>
                        <TouchableOpacity
                            onPress={onSave}
                            disabled={saving}
                            style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, opacity: saving ? 0.6 : 1 }}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={{ fontSize: fs(15), color: '#fff', fontWeight: '700' }}>{t.editDoseSave}</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
                        <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '600', marginTop: 4 }}>
                            {dose.medicine?.name ?? dose.name}
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
                        <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{t.editDoseDay}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {ALL_DAYS.map(d => {
                                    const active = selectedDay === d;
                                    return (
                                        <TouchableOpacity
                                            key={d}
                                            onPress={() => onDayChange(d)}
                                            activeOpacity={0.7}
                                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: active ? '#1e3a8a' : '#f1f5f9' }}
                                        >
                                            <Text style={{ fontSize: fs(13), fontWeight: '700', color: active ? '#fff' : '#94a3b8' }}>
                                                {dayShort[d]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{t.editDoseAmount}</Text>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 52, overflow: 'hidden' }}>
                                    <TouchableOpacity
                                        onPress={() => onAmountChange(-50)}
                                        activeOpacity={0.7}
                                        style={{ paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: isRTL ? 0 : 1, borderLeftWidth: isRTL ? 1 : 0, borderColor: '#e2e8f0' }}
                                    >
                                        <Ionicons name="remove" size={18} color="#1e3a8a" />
                                    </TouchableOpacity>
                                    <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: fs(15), color: '#172554' }}>{amountMg}</Text>
                                    <TouchableOpacity
                                        onPress={() => onAmountChange(50)}
                                        activeOpacity={0.7}
                                        style={{ paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: isRTL ? 0 : 1, borderRightWidth: isRTL ? 1 : 0, borderColor: '#e2e8f0' }}
                                    >
                                        <Ionicons name="add" size={18} color="#1e3a8a" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{t.editDoseTime}</Text>
                                <TouchableOpacity
                                    onPress={onOpenTimePicker}
                                    activeOpacity={0.7}
                                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#172554' }}>
                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {showTimePicker && Platform.OS === 'android' && (
                        <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={onTimeChange} />
                    )}

                    {Platform.OS === 'ios' && showTimePicker && (
                        <View style={{ marginTop: 12 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 }}>
                                <Text style={{ fontSize: fs(14), color: '#64748b', fontWeight: '600' }}>{t.editDoseSelectTime}</Text>
                                <TouchableOpacity
                                    onPress={onConfirmIOSTime}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(14) }}>{t.editDoseDone}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempTime}
                                mode="time"
                                is24Hour={false}
                                display="spinner"
                                onChange={onTimeChange}
                                themeVariant="light"
                                accentColor="#3b82f6"
                                textColor="#172554"
                                style={{ backgroundColor: '#fff' }}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const Doses = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { doses, loading, error } = useSelector((s: RootState) => s.doses);
    const { userId } = useSelector((s: RootState) => s.auth);
    const { fs } = useFontScale();
    const { t, isRTL, language } = useTranslation();

    const dayShort = language === 'ar' ? DAY_SHORT_AR : DAY_SHORT;

    const [editState, setEditState] = useState<EditState | null>(null);
    const [deactivating, setDeactivating] = useState<string | null>(null);

    const loadDoses = useCallback(() => {
        dispatch(fetchDoses());
    }, [dispatch]);

    useFocusEffect(
        useCallback(() => {
            loadDoses();
        }, [loadDoses])
    );

    const medTree = buildMedTree(doses, userId ?? undefined);

    const openEditModal = (dose: BackendDose) => {
        const hhmm = parseBackendTime(dose.localTime);
        const time = timeToDate(hhmm);
        setEditState({
            dose,
            selectedDay: dose.doseDay,
            time,
            tempTime: time,
            amountMg: dose.doseInMilligram,
            showTimePicker: false,
            saving: false,
        });
    };

    const handleEditDayChange = (d: DayOfWeek) => {
        setEditState(prev => prev ? { ...prev, selectedDay: d } : prev);
    };

    const handleEditAmountChange = (delta: number) => {
        setEditState(prev => {
            if (!prev) return prev;
            return { ...prev, amountMg: Math.min(5000, Math.max(1, prev.amountMg + delta)) };
        });
    };

    const handleOpenTimePicker = () => {
        setEditState(prev => prev ? { ...prev, tempTime: new Date(prev.time), showTimePicker: true } : prev);
    };

    const handleTimeChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setEditState(prev => {
                if (!prev) return prev;
                return { ...prev, showTimePicker: false, time: d ?? prev.time, tempTime: d ?? prev.tempTime };
            });
        } else {
            if (d) setEditState(prev => prev ? { ...prev, tempTime: d } : prev);
        }
    };

    const handleConfirmIOSTime = () => {
        setEditState(prev => prev ? { ...prev, time: prev.tempTime, showTimePicker: false } : prev);
    };

    const handleSaveEdit = async () => {
        if (!editState) return;
        const medicineId = editState.dose.medicine?.id;
        if (!medicineId) {
            Alert.alert(t.error, t.missingMedicine);
            return;
        }
        setEditState(prev => prev ? { ...prev, saving: true } : prev);
        const doseId = editState.dose.id;
        const timeStr = dateToTimeString(editState.time);
        const params = new URLSearchParams();
        params.append('name', editState.dose.name);
        params.append('dayOfWeek', editState.selectedDay);
        params.append('localTime', timeStr);
        params.append('doseInMilligram', String(editState.amountMg));
        params.append('MedicineId', String(medicineId));
        try {
            await api.post(`/api/dose/edit/${doseId}`, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            dispatch(fetchDoses());
            setEditState(null);
            Toast.show({
                type: 'success',
                text1: t.toastDoseEdited ?? 'Dose updated',
                text2: `${editState.dose.medicine?.name ?? editState.dose.name} ${t.toastDoseEditedSub ?? 'was successfully updated.'}`,
                position: 'bottom',
                visibilityTime: 3000,
            });
        } catch (e: any) {
            const msg = typeof e?.response?.data === 'string' ? e.response.data : t.failedSaveChanges;
            Alert.alert(t.error, msg);
            setEditState(prev => prev ? { ...prev, saving: false } : prev);
        }
    };

    const handleDeactivateCluster = (identifier: string, medName: string, count: number) => {
        Alert.alert(
            'Deactivate Schedule',
            `Deactivate all ${count} dose${count !== 1 ? 's' : ''} in this "${medName}" schedule?`,
            [
                { text: t.editDoseCancel, style: 'cancel' },
                {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: async () => {
                        setDeactivating(identifier);
                        try {
                            await api.get(`/api/dose/deactivate/${identifier}`);
                            dispatch(fetchDoses());
                            Toast.show({
                                type: 'success',
                                text1: t.toastScheduleDeactivated ?? 'Schedule deactivated',
                                text2: `${medName} ${t.toastScheduleDeactivatedSub ?? 'schedule was successfully deactivated.'}`,
                                position: 'bottom',
                                visibilityTime: 3000,
                            });
                        } catch (e: any) {
                            Alert.alert(t.error, typeof e?.response?.data === 'string' ? e.response.data : t.failedSaveChanges);
                        } finally {
                            setDeactivating(null);
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteDose = (dose: BackendDose) => {
        const displayTime = formatTime(parseBackendTime(dose.localTime));
        const day = dayShort[dose.doseDay] ?? dose.doseDay;
        const medName = dose.medicine?.name ?? dose.name;
        Alert.alert(
            'Delete Dose',
            `Delete the ${day} ${displayTime} dose of "${medName}"?`,
            [
                { text: t.editDoseCancel, style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/dose/delete/${dose.id}`);
                            dispatch(fetchDoses());
                            Toast.show({
                                type: 'success',
                                text1: t.toastDoseDeleted ?? 'Dose removed',
                                text2: `${medName} (${day} ${displayTime}) ${t.toastDoseDeletedSub ?? 'was successfully removed.'}`,
                                position: 'bottom',
                                visibilityTime: 3000,
                            });
                        } catch (e: any) {
                            Alert.alert(t.error, typeof e?.response?.data === 'string' ? e.response.data : t.failedSaveChanges);
                        }
                    },
                },
            ]
        );
    };

    const handleAddMoreDoses = (med: MedCluster) => {
        router.push({
            pathname: '/medication/[id]' as any,
            params: {
                id: med.medId,
                name: med.medName,
                dose: '',
                method: '',
                effects: '',
                existingIdentifier: med.clusters[0]?.identifier ?? '',
            },
        });
    };

    const activeDoseCount = doses.filter(d => d.isActive !== false).length;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: fs(28), fontWeight: '800', color: '#172554' }}>{t.dosesTitle}</Text>
                <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => router.push('/(tabs)/addMedication')}
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22 }}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={{ fontSize: fs(14), color: '#fff', fontWeight: '700', marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}>{t.dosesAdd}</Text>
                </TouchableOpacity>
            </View>

            {error && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, padding: 12, alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                    <Text style={{ fontSize: fs(13), color: '#dc2626', fontWeight: '500', marginLeft: 8, flex: 1 }}>{error}</Text>
                    <TouchableOpacity onPress={loadDoses}>
                        <Text style={{ fontSize: fs(13), color: '#ef4444', fontWeight: '700' }}>{t.retry}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDoses} tintColor="#1e3a8a" />}
            >
                {loading && doses.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text style={{ fontSize: fs(14), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.dosesLoading}</Text>
                    </View>
                ) : medTree.length === 0 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                        <Ionicons name="medical-outline" size={52} color="#94a3b8" />
                        <Text style={{ fontSize: fs(17), color: '#94a3b8', fontWeight: '700', marginTop: 16 }}>{t.dosesNoneYet}</Text>
                        <Text style={{ fontSize: fs(13), color: '#cbd5e1', marginTop: 4 }}>{t.dosesGetStarted}</Text>
                    </View>
                ) : (
                    medTree.map(med => (
                        <View key={med.medId} style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, overflow: 'hidden' }}>

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                        <Text style={{ fontSize: fs(17), fontWeight: '800', color: '#172554' }}>{med.medName}</Text>
                                        {med.isCustom && (
                                            <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                                                <Text style={{ fontSize: fs(10), color: '#7c3aed', fontWeight: '700' }}>{t.custom}</Text>
                                            </View>
                                        )}
                                        {med.prescribedByDoctor && med.addedByName && (
                                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#ecfeff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, gap: 3 }}>
                                                <Ionicons name="medkit-outline" size={10} color="#0891b2" />
                                                <Text style={{ fontSize: fs(10), color: '#0891b2', fontWeight: '700' }}>
                                                    {t.prescribed} · {med.addedByName.charAt(0).toUpperCase() + med.addedByName.slice(1)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {med.startDate && (
                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                                            {t.from} {med.startDate}{med.endDate ? ` · ${t.until} ${med.endDate}` : ''}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleAddMoreDoses(med)}
                                    activeOpacity={0.7}
                                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}
                                >
                                    <Ionicons name="add" size={14} color="#1e3a8a" />
                                    <Text style={{ fontSize: fs(12), color: '#1e3a8a', fontWeight: '700', marginLeft: isRTL ? 0 : 3, marginRight: isRTL ? 3 : 0 }}>{t.addMoreDoses}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ paddingVertical: 8 }}>
                                {med.clusters.map((cluster, clusterIdx) => {
                                    const isDeactivating = deactivating === cluster.identifier;
                                    const isLast = clusterIdx === med.clusters.length - 1;
                                    const hasIdentifier = cluster.identifier !== 'default';

                                    return (
                                        <View key={cluster.identifier} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#f1f5f9', paddingBottom: isLast ? 4 : 12, marginBottom: isLast ? 0 : 12 }}>

                                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 8 }}>
                                                <Text style={{ fontSize: fs(11), color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    {t.dosesSchedule} {clusterIdx + 1}
                                                </Text>
                                                {hasIdentifier && (
                                                    <TouchableOpacity
                                                        onPress={() => handleDeactivateCluster(cluster.identifier, med.medName, cluster.doses.length)}
                                                        disabled={isDeactivating}
                                                        activeOpacity={0.7}
                                                        style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4, opacity: isDeactivating ? 0.5 : 1 }}
                                                    >
                                                        {isDeactivating
                                                            ? <ActivityIndicator size="small" color="#ef4444" />
                                                            : <>
                                                                <Ionicons name="pause-circle-outline" size={13} color="#ef4444" />
                                                                <Text style={{ fontSize: fs(11), color: '#ef4444', fontWeight: '700' }}>Deactivate all</Text>
                                                            </>
                                                        }
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
                                                {cluster.doses.map(dose => {
                                                    const displayTime = formatTime(parseBackendTime(dose.localTime));
                                                    return (
                                                        <View
                                                            key={dose.id}
                                                            style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', minWidth: 100 }}
                                                        >
                                                            <Text style={{ fontSize: fs(12), fontWeight: '800', color: '#1e3a8a', marginBottom: 2 }}>
                                                                {dayShort[dose.doseDay] ?? dose.doseDay}
                                                            </Text>
                                                            <Text style={{ fontSize: fs(11), color: '#f97316', fontWeight: '700', marginBottom: 2 }}>{displayTime}</Text>
                                                            <Text style={{ fontSize: fs(11), color: '#64748b', fontWeight: '600', marginBottom: 8 }}>{dose.doseInMilligram} mg</Text>
                                                            <View style={{ flexDirection: 'row', gap: 5 }}>
                                                                <TouchableOpacity
                                                                    onPress={() => openEditModal(dose)}
                                                                    activeOpacity={0.7}
                                                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 3 }}
                                                                >
                                                                    <Ionicons name="pencil-outline" size={11} color="#1e3a8a" />
                                                                    <Text style={{ fontSize: fs(11), color: '#1e3a8a', fontWeight: '700' }}>{t.editDoseTitle}</Text>
                                                                </TouchableOpacity>
                                                                {!hasIdentifier && (
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDeleteDose(dose)}
                                                                        activeOpacity={0.7}
                                                                        style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 }}
                                                                    >
                                                                        <Ionicons name="trash-outline" size={11} color="#ef4444" />
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </ScrollView>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {editState && (
                <EditDoseModal
                    editState={editState}
                    onClose={() => setEditState(null)}
                    onSave={handleSaveEdit}
                    onDayChange={handleEditDayChange}
                    onAmountChange={handleEditAmountChange}
                    onOpenTimePicker={handleOpenTimePicker}
                    onTimeChange={handleTimeChange}
                    onConfirmIOSTime={handleConfirmIOSTime}
                    fs={fs}
                    t={t}
                    isRTL={isRTL}
                    dayShort={dayShort}
                />
            )}

            {/* Toast must be rendered inside the screen so it appears above the tab bar */}
            <Toast />
        </SafeAreaView>
    );
};

export default Doses;
