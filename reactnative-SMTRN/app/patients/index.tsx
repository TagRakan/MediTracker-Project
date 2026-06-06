import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    Modal, Alert, ActivityIndicator, RefreshControl,
    KeyboardAvoidingView, Platform, Keyboard, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import api from '../../services/api';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';
import { Patient } from './constants';
import PatientDetailModal from './PatientDetailModal';

export default function Patients() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();
    const roles = useSelector((s: RootState) => s.auth.roles);
    const isModerator = roles.includes('ROLE_MODERATOR') || roles.includes('ROLE_ADMIN');

    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [username, setUsername] = useState('');
    const [patientCode, setPatientCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const loadPatients = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await api.get('/api/protected/patient/checkpatients');
            if (res.status === 204 || res.data == null) { setPatients([]); return; }
            const raw = Array.isArray(res.data) ? res.data : [];
            setPatients(raw.map((u: any) => ({
                id: u.id ?? 0,
                username: u.username ?? '',
                displayName: u.name
                    ? u.name.charAt(0).toUpperCase() + u.name.slice(1)
                    : (u.username ?? 'Unknown'),
            })));
        } catch (e: any) {
            if (e?.response?.status === 204) { setPatients([]); return; }
            setFetchError(typeof e?.response?.data === 'string' ? e.response.data : t.couldntLoadPatients);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { if (isModerator) loadPatients(); }, [isModerator]);

    const handleAdd = async () => {
        const trimUser = username.trim().toLowerCase();
        const trimCode = patientCode.trim().toUpperCase();
        if (!trimUser || trimCode.length !== 6) return;
        setSubmitting(true);
        try {
            await api.get(
                `/api/protected/patient/add/${encodeURIComponent(trimUser)}/${encodeURIComponent(trimCode)}`
            );
            setUsername('');
            setPatientCode('');
            setShowAddModal(false);
            Keyboard.dismiss();
            loadPatients();
        } catch (e: any) {
            Alert.alert(t.error, typeof e?.response?.data === 'string'
                ? e.response.data
                : t.addPatientFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = (patient: Patient) => {
        Alert.alert(t.removePatient, t.removePatientConfirm(patient.displayName), [
            { text: t.cancel, style: 'cancel' },
            {
                text: t.remove, style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/api/protected/patient/remove/${encodeURIComponent(patient.username)}`);
                        setPatients(prev => prev.filter(p => p.username !== patient.username));
                    } catch (e: any) {
                        Alert.alert(t.error, typeof e?.response?.data === 'string' ? e.response.data : t.removePatientFailed);
                    }
                },
            },
        ]);
    };

    if (!isModerator) {
        return (
            <SafeAreaView style={[styles.root, styles.centered, { paddingHorizontal: 32 }]}>
                <View style={styles.lockBox}>
                    <View style={styles.lockIconWrap}>
                        <Ionicons name="lock-closed-outline" size={36} color="#f97316" />
                    </View>
                    <Text style={[styles.lockTitle, { fontSize: fs(20) }]}>{t.doctorAccessOnly}</Text>
                    <Text style={[styles.lockSub, { fontSize: fs(13) }]}>{t.doctorAccessDesc}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { fontSize: fs(26), textAlign: isRTL ? 'right' : 'left' }]}>{t.patients}</Text>
                    <Text style={[styles.headerSub, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>{t.doctorView}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.7}>
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <Text style={[styles.addBtnText, { fontSize: fs(13) }]}>{t.add}</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.doctorBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#1e3a8a" />
                <Text style={[styles.doctorBadgeText, { fontSize: fs(12) }]}>{t.moderatorDoctorView}</Text>
            </View>

            {patients.length > 0 && (
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="people-outline" size={15} color="#1e3a8a" />
                    <Text style={[styles.summaryText, { fontSize: fs(13) }]}>
                        {patients.length} {patients.length !== 1 ? t.patientCount_other : t.patientCount_one}
                    </Text>
                    <Text style={[styles.summaryHint, { fontSize: fs(12) }]}>· {t.tapToViewDetails}</Text>
                </View>
            )}

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPatients} tintColor="#1e3a8a" />}
            >
                {loading && patients.length === 0 ? (
                    <View style={[styles.centered, { paddingTop: 80 }]}>
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text style={[styles.subText, { fontSize: fs(14) }]}>{t.loadingPatients}</Text>
                    </View>
                ) : fetchError ? (
                    <View style={[styles.centered, { paddingTop: 80 }]}>
                        <Ionicons name="alert-circle-outline" size={40} color="#fca5a5" />
                        <Text style={[styles.errorText, { fontSize: fs(15) }]}>{t.couldntLoadPatients}</Text>
                        <Text style={[styles.subText, { fontSize: fs(12) }]}>{fetchError}</Text>
                        <TouchableOpacity onPress={loadPatients} style={styles.retryBtn} activeOpacity={0.7}>
                            <Text style={[styles.retryBtnText, { fontSize: fs(14) }]}>{t.retry}</Text>
                        </TouchableOpacity>
                    </View>
                ) : patients.length === 0 ? (
                    <View style={[styles.centered, { paddingTop: 80 }]}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="medkit-outline" size={36} color="#94a3b8" />
                        </View>
                        <Text style={[styles.emptyTitle, { fontSize: fs(17) }]}>{t.noPatients}</Text>
                        <Text style={[styles.emptySub, { fontSize: fs(13) }]}>{t.noPatientsDesc}</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.emptyBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.7}>
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                            <Text style={[styles.addBtnText, { fontSize: fs(14) }]}>{t.addFirstPatient}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    patients.map(p => (
                        <TouchableOpacity
                            key={p.username}
                            style={[styles.patientCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            activeOpacity={0.7}
                            onPress={() => setSelectedPatient(p)}
                        >
                            <View style={styles.patientAvatar}>
                                <Text style={[styles.patientAvatarText, { fontSize: fs(20) }]}>
                                    {(p.displayName[0] ?? '?').toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.patientName, { fontSize: fs(16), textAlign: isRTL ? 'right' : 'left' }]}>{p.displayName}</Text>
                                <Text style={[styles.patientUsername, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>{p.username}</Text>
                                <View style={[styles.viewHint, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                                    <Text style={[styles.viewHintText, { fontSize: fs(10) }]}>{t.dosesHistoryAilmentsFamily}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={e => { (e as any).stopPropagation?.(); handleRemove(p); }}
                                activeOpacity={0.7}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={{ padding: 8, marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}
                            >
                                <Ionicons name="trash-outline" size={19} color="#ef4444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {selectedPatient && (
                <PatientDetailModal
                    patient={selectedPatient}
                    visible={!!selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                />
            )}

            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.addModalSheet}>
                            <View style={styles.modalHandle} />
                            <View style={[styles.addModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View>
                                    <Text style={[styles.addModalTitle, { fontSize: fs(22), textAlign: isRTL ? 'right' : 'left' }]}>{t.addPatient}</Text>
                                    <Text style={[styles.addModalSub, { fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }]}>{t.enterEmailAndCode}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => { setShowAddModal(false); setUsername(''); setPatientCode(''); Keyboard.dismiss(); }}
                                    style={styles.closeBtn}
                                >
                                    <Ionicons name="close" size={18} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.patientUsernameLabel}</Text>
                            <View style={[styles.inputWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={[styles.input, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]}
                                    placeholder={t.patientEmailPlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                />
                            </View>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.patientCodeLabel}</Text>
                            <View style={[styles.inputWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="key-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={[styles.input, { fontSize: fs(15), letterSpacing: 4, textAlign: isRTL ? 'right' : 'left' }]}
                                    placeholder={t.patientCodePlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={patientCode}
                                    onChangeText={t => setPatientCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    maxLength={6}
                                    returnKeyType="done"
                                    onSubmitEditing={handleAdd}
                                />
                            </View>

                            <Text style={[styles.modalHint, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.patientCodeHint}</Text>

                            <View style={[styles.modalBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <TouchableOpacity
                                    onPress={() => { setShowAddModal(false); setUsername(''); setPatientCode(''); Keyboard.dismiss(); }}
                                    style={styles.cancelBtn}
                                    activeOpacity={0.7}
                                    disabled={submitting}
                                >
                                    <Text style={[styles.cancelBtnText, { fontSize: fs(15) }]}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleAdd}
                                    disabled={!username.trim() || patientCode.length !== 6 || submitting}
                                    style={[styles.confirmBtn, {
                                        opacity: username.trim() && patientCode.length === 6 && !submitting ? 1 : 0.5,
                                    }]}
                                    activeOpacity={0.7}
                                >
                                    {submitting
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={[styles.confirmBtnText, { fontSize: fs(15) }]}>{t.addPatient}</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, alignItems: 'center' },
    headerTitle: { fontWeight: 'bold', color: '#172554' },
    headerSub: { color: '#94a3b8', marginTop: 2 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignItems: 'center', gap: 6 },
    addBtnText: { color: '#fff', fontWeight: 'bold' },
    doctorBadgeRow: { alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginHorizontal: 24, marginBottom: 12 },
    doctorBadgeText: { color: '#1e3a8a', fontWeight: 'bold' },
    summaryRow: { alignItems: 'center', gap: 6, marginHorizontal: 24, marginBottom: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
    summaryText: { fontWeight: 'bold', color: '#1e3a8a' },
    summaryHint: { color: '#94a3b8' },
    scroll: { flex: 1, paddingHorizontal: 24 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    subText: { color: '#94a3b8', fontWeight: '500', marginTop: 12 },
    errorText: { color: '#ef4444', fontWeight: 'bold', marginTop: 12 },
    retryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16, marginTop: 16 },
    retryBtnText: { color: '#fff', fontWeight: 'bold' },
    emptyIconWrap: { width: 72, height: 72, backgroundColor: '#eff6ff', borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 },
    emptySub: { color: '#cbd5e1', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, alignItems: 'center', gap: 8 },
    patientCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center' },
    patientAvatar: { width: 52, height: 52, backgroundColor: '#eff6ff', borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    patientAvatarText: { fontWeight: '900', color: '#1e3a8a' },
    patientName: { fontWeight: 'bold', color: '#172554' },
    patientUsername: { color: '#94a3b8', marginTop: 2 },
    viewHint: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
    viewHintText: { color: '#1d4ed8', fontWeight: '600' },
    lockBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 28, padding: 32, alignItems: 'center' },
    lockIconWrap: { width: 72, height: 72, backgroundColor: '#ffedd5', borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    lockTitle: { fontWeight: 'bold', color: '#172554', marginBottom: 8, textAlign: 'center' },
    lockSub: { color: '#64748b', textAlign: 'center', lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalHandle: { width: 48, height: 4, backgroundColor: '#e2e8f0', borderRadius: 999, alignSelf: 'center', marginBottom: 16 },
    closeBtn: { backgroundColor: '#f1f5f9', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    addModalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    addModalHeader: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    addModalTitle: { fontWeight: 'bold', color: '#172554' },
    addModalSub: { color: '#94a3b8', marginTop: 2 },
    inputLabel: { color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    inputWrap: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', gap: 12, marginBottom: 16 },
    input: { flex: 1, fontWeight: '500', color: '#172554' },
    modalHint: { color: '#94a3b8', lineHeight: 18, marginBottom: 20 },
    modalBtnRow: { gap: 12 },
    cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    confirmBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});