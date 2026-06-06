import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { BackendDose, BackendPastDose, BackendAilment } from '../../services/api';
import api from '../../services/api';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';
import { formatTime, parseBackendTime } from '../utils/doseHelpers';
import { AilmentFormModal } from './AilmentFormModal';
import { AddPatientDoseModal } from './AddPatientDoseModal';
import { EditPatientDoseModal } from './EditPatientDoseModal';
import {
    Patient, FamilyAilmentEntry, PatientTab,
    STATUS_LABELS, statusColor, statusBg, statusLabel,
} from './constants';
import { AilmentStatus } from '../../services/api';

const DAY_SHORT: Record<string, string> = {
    MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
    FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

interface MedCluster {
    medName: string;
    medId: string;
    isCustom: boolean;
    startDate?: string;
    endDate?: string;
    clusters: {
        identifier: string;
        doses: BackendDose[];
    }[];
}

function buildMedTree(doses: BackendDose[]): MedCluster[] {
    const active = doses.filter(d => d.isActive !== false);
    const byMed: Record<string, {
        medName: string; medId: string; isCustom: boolean;
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
        startDate: med.startDate,
        endDate: med.endDate,
        clusters: Object.entries(med.byIdentifier).map(([identifier, ds]) => ({ identifier, doses: ds })),
    }));
}

function PatientDetailModal({
                                patient, visible, onClose,
                            }: { patient: Patient; visible: boolean; onClose: () => void }) {
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();
    const dispatch = useDispatch<AppDispatch>();
    const [tab, setTab] = useState<PatientTab>('doses');

    const [activeDoses, setActiveDoses] = useState<BackendDose[]>([]);
    const [dosesLoading, setDosesLoading] = useState(false);
    const [dosesLoaded, setDosesLoaded] = useState(false);

    const [history, setHistory] = useState<BackendPastDose[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const [ailments, setAilments] = useState<BackendAilment[]>([]);
    const [ailmentsLoading, setAilmentsLoading] = useState(false);
    const [ailmentsLoaded, setAilmentsLoaded] = useState(false);

    const [familyAilments, setFamilyAilments] = useState<FamilyAilmentEntry[]>([]);
    const [familyLoading, setFamilyLoading] = useState(false);
    const [familyLoaded, setFamilyLoaded] = useState(false);

    const [showAilmentModal, setShowAilmentModal] = useState(false);
    const [editTargetAilment, setEditTargetAilment] = useState<BackendAilment | undefined>(undefined);

    const [showAddDoseModal, setShowAddDoseModal] = useState(false);
    const [showEditDoseModal, setShowEditDoseModal] = useState(false);
    const [editTargetDose, setEditTargetDose] = useState<BackendDose | null>(null);

    const [deactivating, setDeactivating] = useState<string | null>(null);

    const resetState = () => {
        setTab('doses');
        setActiveDoses([]); setDosesLoaded(false);
        setHistory([]); setHistoryLoaded(false);
        setAilments([]); setAilmentsLoaded(false);
        setFamilyAilments([]); setFamilyLoaded(false);
    };

    useEffect(() => {
        if (visible) {
            resetState();
            loadDoses();
        }
    }, [visible]);

    useEffect(() => {
        if (visible && tab === 'history' && !historyLoaded) loadHistory();
        if (visible && tab === 'ailments' && !ailmentsLoaded) loadAilments();
        if (visible && tab === 'family' && !familyLoaded) loadFamilyAilments();
    }, [tab, visible]);

    const loadDoses = useCallback(async () => {
        setDosesLoading(true);
        try {
            const activeRes = await api.get<BackendDose[]>(
                `/api/protected/patient/checkactivedose/${encodeURIComponent(patient.username)}`
            );
            setActiveDoses(Array.isArray(activeRes.data) ? activeRes.data : []);
        } catch {
            setActiveDoses([]);
        } finally {
            setDosesLoading(false);
            setDosesLoaded(true);
        }
    }, [patient.username]);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get<BackendPastDose[]>(`/api/pastdoses/user/${patient.id}`);
            const filtered = (Array.isArray(res.data) ? res.data : []).filter(r => {
                const n = r.doseStatus?.name ?? '';
                return !['NONE', 'PENDING', ''].includes(n);
            });
            filtered.sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return b.date.localeCompare(a.date);
            });
            setHistory(filtered);
        } catch {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
            setHistoryLoaded(true);
        }
    }, [patient.id]);

    const loadAilments = useCallback(async () => {
        setAilmentsLoading(true);
        try {
            const res = await api.get<BackendAilment[]>(`/api/protected/ailment/users/get/${patient.id}`);
            setAilments(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAilments([]);
        } finally {
            setAilmentsLoading(false);
            setAilmentsLoaded(true);
        }
    }, [patient.id]);

    const loadFamilyAilments = useCallback(async () => {
        setFamilyLoading(true);
        try {
            const res = await api.get<FamilyAilmentEntry[]>(
                `/api/protected/patient/checkpatientfamily/${encodeURIComponent(patient.username)}`
            );
            if (res.status === 204 || !res.data) {
                setFamilyAilments([]);
            } else {
                setFamilyAilments(Array.isArray(res.data) ? res.data : []);
            }
        } catch {
            setFamilyAilments([]);
        } finally {
            setFamilyLoading(false);
            setFamilyLoaded(true);
        }
    }, [patient.username]);

    const handleAddAilment = () => { setEditTargetAilment(undefined); setShowAilmentModal(true); };
    const handleEditAilment = (ailment: BackendAilment) => { setEditTargetAilment(ailment); setShowAilmentModal(true); };

    const handleDeleteAilment = (ailment: BackendAilment) => {
        Alert.alert(
            t.removeCondition,
            t.removeConditionConfirm(ailment.ailmentName),
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.remove, style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/protected/ailment/user/delete/${ailment.id}`);
                            setAilments(prev => prev.filter(a => a.id !== ailment.id));
                        } catch (e: any) {
                            Alert.alert(t.error, typeof e?.response?.data === 'string'
                                ? e.response.data : t.ailmentDeleteFailed);
                        }
                    },
                },
            ]
        );
    };

    const handleDeactivateCluster = (identifier: string, medName: string, count: number) => {
        Alert.alert(
            t.deactivateScheduleTitle,
            t.deactivateScheduleMsg(count, medName),
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.deactivate, style: 'destructive',
                    onPress: async () => {
                        setDeactivating(identifier);
                        try {
                            await api.get(`/api/dose/deactivate/${identifier}`);
                            loadDoses();
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

    const handleDeleteSingleDose = (dose: BackendDose) => {
        const displayTime = formatTime(parseBackendTime(dose.localTime));
        const day = DAY_SHORT[dose.doseDay] ?? dose.doseDay;
        Alert.alert(
            t.deactivateDoseTitle,
            t.deactivateDoseMsg(day, displayTime, dose.medicine?.name ?? dose.name),
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.deactivate, style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/dose/delete/${dose.id}`);
                            setActiveDoses(prev => prev.filter(d => d.id !== dose.id));
                        } catch (e: any) {
                            Alert.alert(t.error, typeof e?.response?.data === 'string' ? e.response.data : t.failedSaveChanges);
                        }
                    },
                },
            ]
        );
    };

    const medTree = buildMedTree(activeDoses);

    const tabs: { key: PatientTab; label: string; icon: string }[] = [
        { key: 'doses', label: t.tabDoses, icon: 'medical-outline' },
        { key: 'history', label: t.tabHistory, icon: 'time-outline' },
        { key: 'ailments', label: t.tabAilments, icon: 'fitness-outline' },
        { key: 'family', label: t.tabFamily, icon: 'people-outline' },
    ];

    return (
        <>
            {/* ── Main modal ─────────────────────────────────────────────── */}
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                    {/*
                     * KEY FIX: flex:1 + maxHeight so the sheet fills its allowed
                     * space and child ScrollViews have a bounded container to fill.
                     */}
                    <View style={{
                        flex: 1,
                        maxHeight: '90%',
                        backgroundColor: '#fff',
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        paddingHorizontal: 24,
                        paddingTop: 20,
                    }}>
                        {/* Drag handle */}
                        <View style={{ width: 48, height: 4, backgroundColor: '#e2e8f0', borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />

                        {/* Header */}
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 56, height: 56, backgroundColor: '#eff6ff', borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: fs(24), fontWeight: '900', color: '#1e3a8a' }}>
                                    {(patient.displayName[0] ?? '?').toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0 }}>
                                <Text style={{ fontSize: fs(20), fontWeight: 'bold', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}>{patient.displayName}</Text>
                                <Text style={{ fontSize: fs(12), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{patient.username}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#f1f5f9', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {/* Tab bar */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 12, flexGrow: 0 }}
                            contentContainerStyle={{ paddingHorizontal: 4 }}
                        >
                            <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 }}>
                                {tabs.map(tb => (
                                    <TouchableOpacity
                                        key={tb.key}
                                        onPress={() => setTab(tb.key)}
                                        style={[
                                            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, gap: 4 },
                                            tab === tb.key && { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={tb.icon as any} size={13} color={tab === tb.key ? '#1e3a8a' : '#94a3b8'} />
                                        <Text style={{ fontSize: fs(11), fontWeight: tab === tb.key ? '700' : '600', color: tab === tb.key ? '#1e3a8a' : '#94a3b8' }}>
                                            {tb.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* ── DOSES TAB ──────────────────────────────────────── */}
                        {tab === 'doses' && (
                            // KEY FIX: flex:1 wrapper gives the ScrollView a bounded height
                            <View style={{ flex: 1 }}>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {dosesLoading ? t.dosesLoading : t.activeCountLabel(activeDoses.length)}
                                        </Text>
                                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                                            <TouchableOpacity onPress={loadDoses} disabled={dosesLoading} activeOpacity={0.7}>
                                                <Ionicons name="refresh" size={16} color={dosesLoading ? '#cbd5e1' : '#94a3b8'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setShowAddDoseModal(true)}
                                                activeOpacity={0.7}
                                                style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}
                                            >
                                                <Ionicons name="add" size={14} color="#fff" />
                                                <Text style={{ fontSize: fs(12), color: '#fff', fontWeight: 'bold' }}>{t.addDoseBtn}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {dosesLoading ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <ActivityIndicator size="large" color="#1e3a8a" />
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.loadingDoses}</Text>
                                        </View>
                                    ) : medTree.length === 0 ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <Ionicons name="medical-outline" size={36} color="#cbd5e1" />
                                            <Text style={{ fontSize: fs(14), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.noDosesScheduled}</Text>
                                            <TouchableOpacity
                                                onPress={() => setShowAddDoseModal(true)}
                                                activeOpacity={0.7}
                                                style={{ backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 12 }}
                                            >
                                                <Ionicons name="add" size={14} color="#fff" />
                                                <Text style={{ fontSize: fs(13), color: '#fff', fontWeight: 'bold' }}>{t.addDoseBtn}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        medTree.map(med => (
                                            <View key={med.medId} style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, overflow: 'hidden' }}>
                                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                            <Text style={{ fontSize: fs(16), fontWeight: '800', color: '#172554' }}>{med.medName}</Text>
                                                            {med.isCustom && (
                                                                <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                                                                    <Text style={{ fontSize: fs(10), color: '#7c3aed', fontWeight: '700' }}>{t.custom}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        {med.startDate && (
                                                            <Text style={{ fontSize: fs(11), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                                                                {med.startDate}{med.endDate ? ` · ${t.until} ${med.endDate}` : ''}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>

                                                <View style={{ paddingVertical: 8 }}>
                                                    {med.clusters.map((cluster, clusterIdx) => {
                                                        const isDeactivating = deactivating === cluster.identifier;
                                                        const isLast = clusterIdx === med.clusters.length - 1;
                                                        const hasIdentifier = cluster.identifier !== 'default';

                                                        return (
                                                            <View
                                                                key={cluster.identifier}
                                                                style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#f1f5f9', paddingBottom: isLast ? 4 : 12, marginBottom: isLast ? 0 : 12 }}
                                                            >
                                                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 8 }}>
                                                                    <Text style={{ fontSize: fs(11), color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                        {t.scheduleLabel(clusterIdx + 1)}
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
                                                                                    <Text style={{ fontSize: fs(11), color: '#ef4444', fontWeight: '700' }}>{t.deactivateAll}</Text>
                                                                                </>
                                                                            }
                                                                        </TouchableOpacity>
                                                                    )}
                                                                </View>

                                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
                                                                    {cluster.doses.map(dose => {
                                                                        const displayTime = formatTime(parseBackendTime(dose.localTime));
                                                                        const day = DAY_SHORT[dose.doseDay] ?? dose.doseDay;
                                                                        return (
                                                                            <View
                                                                                key={dose.id}
                                                                                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', minWidth: 100 }}
                                                                            >
                                                                                <Text style={{ fontSize: fs(12), fontWeight: '800', color: '#1e3a8a', marginBottom: 2 }}>{day}</Text>
                                                                                <Text style={{ fontSize: fs(11), color: '#f97316', fontWeight: '700', marginBottom: 2 }}>{displayTime}</Text>
                                                                                <Text style={{ fontSize: fs(11), color: '#64748b', fontWeight: '600', marginBottom: 8 }}>{dose.doseInMilligram} mg</Text>
                                                                                <View style={{ flexDirection: 'row', gap: 5 }}>
                                                                                    <TouchableOpacity
                                                                                        onPress={() => { setEditTargetDose(dose); setShowEditDoseModal(true); }}
                                                                                        activeOpacity={0.7}
                                                                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 3 }}
                                                                                    >
                                                                                        <Ionicons name="pencil-outline" size={11} color="#1e3a8a" />
                                                                                        <Text style={{ fontSize: fs(11), color: '#1e3a8a', fontWeight: '700' }}>{t.addMedEdit}</Text>
                                                                                    </TouchableOpacity>
                                                                                    {!hasIdentifier && (
                                                                                        <TouchableOpacity
                                                                                            onPress={() => handleDeleteSingleDose(dose)}
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
                            </View>
                        )}

                        {/* ── HISTORY TAB ────────────────────────────────────── */}
                        {tab === 'history' && (
                            <View style={{ flex: 1 }}>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {historyLoading ? t.histLoading : `${history.length} ${t.historyRecordsLabel(history.length)}`}
                                        </Text>
                                        <TouchableOpacity onPress={loadHistory} disabled={historyLoading} activeOpacity={0.7}>
                                            <Ionicons name="refresh" size={16} color={historyLoading ? '#cbd5e1' : '#94a3b8'} />
                                        </TouchableOpacity>
                                    </View>

                                    {historyLoading ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <ActivityIndicator size="large" color="#1e3a8a" />
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.histLoading}</Text>
                                        </View>
                                    ) : history.length === 0 ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <Ionicons name="time-outline" size={36} color="#cbd5e1" />
                                            <Text style={{ fontSize: fs(14), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.histNoHistory}</Text>
                                        </View>
                                    ) : (
                                        history.map(record => {
                                            const statusName = record.doseStatus?.name ?? 'NONE';
                                            const color = statusColor(statusName);
                                            const bg = statusBg(statusName);
                                            const dose = record.dose;
                                            const medName = dose?.medicine?.name ?? dose?.name ?? '—';
                                            const mg = dose?.doseInMilligram ?? 0;
                                            let dateLabel = '—';
                                            try {
                                                const dt = new Date(record.date);
                                                dateLabel = dt.toLocaleDateString('en-US', {
                                                    weekday: 'short', day: 'numeric', month: 'short',
                                                }) + ' · ' + dt.toLocaleTimeString('en-US', {
                                                    hour: 'numeric', minute: '2-digit', hour12: true,
                                                });
                                            } catch { }

                                            return (
                                                <View key={record.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: isRTL ? 1 : 3, borderRightWidth: isRTL ? 3 : 1, borderLeftColor: isRTL ? '#f1f5f9' : color, borderRightColor: isRTL ? color : '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ fontSize: fs(14), fontWeight: 'bold', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}>{medName}</Text>
                                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{dateLabel}</Text>
                                                    </View>
                                                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
                                                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: bg }}>
                                                            <Text style={{ fontSize: fs(10), fontWeight: '700', textTransform: 'capitalize', color }}>{statusLabel(statusName)}</Text>
                                                        </View>
                                                        {mg > 0 && (
                                                            <Text style={{ fontSize: fs(10), color: '#94a3b8' }}>{mg}mg</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        {/* ── AILMENTS TAB ───────────────────────────────────── */}
                        {tab === 'ailments' && (
                            <View style={{ flex: 1 }}>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {ailmentsLoading ? t.loadingConditions : t.ailmentsCountLabel(ailments.length)}
                                        </Text>
                                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                                            <TouchableOpacity onPress={loadAilments} disabled={ailmentsLoading} activeOpacity={0.7}>
                                                <Ionicons name="refresh" size={16} color={ailmentsLoading ? '#cbd5e1' : '#94a3b8'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleAddAilment}
                                                activeOpacity={0.7}
                                                style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}
                                            >
                                                <Ionicons name="add" size={14} color="#fff" />
                                                <Text style={{ fontSize: fs(12), color: '#fff', fontWeight: 'bold' }}>{t.add}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {ailmentsLoading ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <ActivityIndicator size="large" color="#1e3a8a" />
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.loadingConditions}</Text>
                                        </View>
                                    ) : ailments.length === 0 ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <Ionicons name="fitness-outline" size={36} color="#cbd5e1" />
                                            <Text style={{ fontSize: fs(14), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.noConditionsTracked}</Text>
                                            <TouchableOpacity
                                                onPress={handleAddAilment}
                                                activeOpacity={0.7}
                                                style={{ backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 12 }}
                                            >
                                                <Ionicons name="add" size={14} color="#fff" />
                                                <Text style={{ fontSize: fs(13), color: '#fff', fontWeight: 'bold' }}>{t.addFirstCondition}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        ailments.map(ailment => {
                                            const statusName = ailment.ailmentStatus?.name ?? '';
                                            const isActive = ['ONGOING', 'CHRONIC'].includes(statusName);
                                            return (
                                                <View key={ailment.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, marginBottom: 8 }}>
                                                    <View style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: isActive ? '#fef2f2' : '#f0fdf4', borderColor: isActive ? '#fecaca' : '#bbf7d0' }}>
                                                        <Ionicons name="fitness" size={16} color={isActive ? '#ef4444' : '#16a34a'} />
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                                                        <Text style={{ fontSize: fs(15), fontWeight: 'bold', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}>{ailment.ailmentName}</Text>
                                                        {ailment.ailmentType?.name && (
                                                            <Text style={{ fontSize: fs(11), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{ailment.ailmentType.name}</Text>
                                                        )}
                                                    </View>
                                                    {!!statusName && (
                                                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexShrink: 0, backgroundColor: isActive ? '#fee2e2' : '#dcfce7' }}>
                                                            <Text style={{ fontSize: fs(10), fontWeight: '700', color: isActive ? '#ef4444' : '#16a34a' }}>
                                                                {STATUS_LABELS[statusName as AilmentStatus] ?? statusName}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                                                        <TouchableOpacity onPress={() => handleEditAilment(ailment)} activeOpacity={0.7} style={{ width: 30, height: 30, backgroundColor: '#eff6ff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                                                            <Ionicons name="pencil-outline" size={14} color="#2563eb" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => handleDeleteAilment(ailment)} activeOpacity={0.7} style={{ width: 30, height: 30, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                                                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        {/* ── FAMILY TAB ─────────────────────────────────────── */}
                        {tab === 'family' && (
                            <View style={{ flex: 1 }}>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {familyLoading ? t.histLoading : t.familyMembersCountLabel(familyAilments.length)}
                                        </Text>
                                        <TouchableOpacity onPress={loadFamilyAilments} disabled={familyLoading} activeOpacity={0.7}>
                                            <Ionicons name="refresh" size={16} color={familyLoading ? '#cbd5e1' : '#94a3b8'} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfeff', borderWidth: 1, borderColor: '#a5f3fc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 12 }}>
                                        <Ionicons name="information-circle-outline" size={14} color="#0891b2" />
                                        <Text style={{ fontSize: fs(11), color: '#0e7490', fontWeight: '500', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                            {t.familyPrivacyNote}
                                        </Text>
                                    </View>

                                    {familyLoading ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <ActivityIndicator size="large" color="#1e3a8a" />
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.familyLoadingLabel}</Text>
                                        </View>
                                    ) : familyAilments.length === 0 ? (
                                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                                            <Ionicons name="people-outline" size={36} color="#cbd5e1" />
                                            <Text style={{ fontSize: fs(14), color: '#94a3b8', fontWeight: '500', marginTop: 12 }}>{t.noFamilyData}</Text>
                                            <Text style={{ fontSize: fs(12), color: '#cbd5e1', marginTop: 4, textAlign: 'center' }}>
                                                {t.noFamilyDataDesc}
                                            </Text>
                                        </View>
                                    ) : (
                                        familyAilments.map((entry, idx) => (
                                            <View key={`family_${idx}`} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 10 }}>
                                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Ionicons name="person-outline" size={18} color="#64748b" />
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                                                        <Text style={{ fontSize: fs(15), fontWeight: 'bold', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}>{t.familyMember}</Text>
                                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                                                            {t.familyAilmentsCountLabel(entry.ailments.length)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {entry.ailments.length === 0 ? (
                                                    <Text style={{ fontSize: fs(12), color: '#cbd5e1', fontStyle: 'italic', paddingVertical: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.noConditionsTracked}</Text>
                                                ) : (
                                                    entry.ailments.map(ailment => {
                                                        const statusName = ailment.ailmentStatus?.name ?? '';
                                                        const isActive = ['ONGOING', 'CHRONIC'].includes(statusName);
                                                        return (
                                                            <View key={ailment.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                                                                <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: isActive ? '#fee2e2' : '#f0fdf4' }}>
                                                                    <Ionicons name="fitness" size={12} color={isActive ? '#ef4444' : '#16a34a'} />
                                                                </View>
                                                                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}>
                                                                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}>{ailment.ailmentName}</Text>
                                                                    {ailment.ailmentType?.name && (
                                                                        <Text style={{ fontSize: fs(10), color: '#94a3b8', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>{ailment.ailmentType.name}</Text>
                                                                    )}
                                                                </View>
                                                                {!!statusName && (
                                                                    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, flexShrink: 0, backgroundColor: isActive ? '#fee2e2' : '#dcfce7' }}>
                                                                        <Text style={{ fontSize: fs(9), fontWeight: '700', color: isActive ? '#ef4444' : '#16a34a' }}>
                                                                            {STATUS_LABELS[statusName as AilmentStatus] ?? statusName}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })
                                                )}
                                            </View>
                                        ))
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
                <AilmentFormModal
                    visible={showAilmentModal}
                    onClose={() => { setShowAilmentModal(false); setEditTargetAilment(undefined); }}
                    onSuccess={() => { setAilmentsLoaded(false); loadAilments(); }}
                    patientId={patient.id}
                    fs={fs}
                    editTarget={editTargetAilment}
                />

                <AddPatientDoseModal
                    visible={showAddDoseModal}
                    onClose={() => setShowAddDoseModal(false)}
                    onSuccess={() => { setDosesLoaded(false); loadDoses(); }}
                    patientId={patient.id}
                    fs={fs}
                />

                <EditPatientDoseModal
                    visible={showEditDoseModal}
                    onClose={() => { setShowEditDoseModal(false); setEditTargetDose(null); }}
                    onSuccess={() => { setDosesLoaded(false); loadDoses(); }}
                    dose={editTargetDose}
                    fs={fs}
                />
            </Modal>



        </>
    );
}

export default PatientDetailModal;