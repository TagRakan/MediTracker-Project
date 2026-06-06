import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, TextInput,
    Modal, Alert, ActivityIndicator, RefreshControl,
    KeyboardAvoidingView, Platform, Keyboard, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
    fetchDoctorCode, refreshDoctorCode,
    addDoctor,
} from '../store/familySlice';
import api from '../services/api';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

interface Doctor {
    id: number;
    username: string;
    displayName: string;
}

function CodeCard({
                      label, sublabel, code, loading, onRefresh, fs, iconName, color, t,
                  }: {
    label: string; sublabel: string; code: string | null;
    loading: boolean; onRefresh: () => void;
    fs: (n: number) => number; iconName: any; color: string; t: any;
}) {
    return (
        <View style={[styles.codeCard, { borderColor: color + '30' }]}>
            <View style={styles.codeCardHeader}>
                <View style={[styles.codeIconWrap, { backgroundColor: color + '15' }]}>
                    <Ionicons name={iconName} size={18} color={color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.codeLabel, { fontSize: fs(13), color }]}>{label}</Text>
                    <Text style={[styles.codeSub, { fontSize: fs(11) }]}>{sublabel}</Text>
                </View>
                <TouchableOpacity
                    onPress={onRefresh} disabled={loading}
                    style={[styles.refreshBtn, { opacity: loading ? 0.5 : 1 }]}
                    activeOpacity={0.7}
                >
                    {loading
                        ? <ActivityIndicator size="small" color={color} />
                        : <Ionicons name="refresh-outline" size={18} color={color} />
                    }
                </TouchableOpacity>
            </View>
            <View style={styles.codeDisplay}>
                {loading && !code ? (
                    <ActivityIndicator size="small" color={color} style={{ marginVertical: 4 }} />
                ) : (
                    <Text style={[styles.codeText, { fontSize: fs(26), color, letterSpacing: 8 }]}>
                        {code ?? '------'}
                    </Text>
                )}
            </View>
            <Text style={[styles.codeHint, { fontSize: fs(10) }]}>{t.dcValid}</Text>
        </View>
    );
}

function DoctorCard({
                        doctor, onRemove, fs, isRTL,
                    }: { doctor: Doctor; onRemove: (d: Doctor) => void; fs: (n: number) => number; isRTL: boolean }) {
    return (
        <View style={styles.doctorCard}>
            <View style={[styles.doctorCardInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.doctorAvatar}>
                    <Text style={[styles.doctorAvatarText, { fontSize: fs(20) }]}>
                        {(doctor.displayName[0] ?? 'D').toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0 }}>
                    <Text style={[styles.doctorName, { fontSize: fs(16), textAlign: isRTL ? 'right' : 'left' }]}>{doctor.displayName}</Text>
                    <Text style={[styles.doctorUsername, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>{doctor.username}</Text>
                    <View style={[styles.doctorBadge, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Ionicons name="shield-checkmark-outline" size={10} color="#0891b2" />
                        <Text style={[styles.doctorBadgeText, { fontSize: fs(10) }]}>Doctor</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => onRemove(doctor)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function DoctorCenter() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const { doctorCode, doctorCodeLoading, loading, error } =
        useSelector((s: RootState) => s.family);
    const roles = useSelector((s: RootState) => s.auth.roles);
    const isModerator = roles.includes('ROLE_MODERATOR') || roles.includes('ROLE_ADMIN');

    const [patientCode, setPatientCode] = useState<string | null>(null);
    const [patientCodeLoading, setPatientCodeLoading] = useState(false);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [docUsername, setDocUsername] = useState('');
    const [docCode, setDocCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPatientCode = useCallback(async () => {
        setPatientCodeLoading(true);
        try {
            const res = await api.get<string>('/api/family/getpatientcode');
            setPatientCode(String(res.data));
        } catch {
            setPatientCode(null);
        } finally {
            setPatientCodeLoading(false);
        }
    }, []);

    const refreshPatientCode = useCallback(async () => {
        setPatientCodeLoading(true);
        try {
            const res = await api.get<string>('/api/family/refreshpatientcode');
            setPatientCode(String(res.data));
        } catch {
        } finally {
            setPatientCodeLoading(false);
        }
    }, []);

    const loadDoctors = useCallback(async () => {
        setDoctorsLoading(true);
        try {
            const res = await api.get('/api/family/checkdoctors');
            if (res.status === 204 || !res.data) { setDoctors([]); return; }
            const raw = Array.isArray(res.data) ? res.data : [];
            setDoctors(raw.map((u: any) => ({
                id: u.id ?? 0,
                username: u.username ?? '',
                displayName: u.name
                    ? u.name.charAt(0).toUpperCase() + u.name.slice(1)
                    : (u.username ?? 'Unknown'),
            })));
        } catch {
            setDoctors([]);
        } finally {
            setDoctorsLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (isModerator) {
                dispatch(fetchDoctorCode());
            } else {
                fetchPatientCode();
                loadDoctors();
            }
        }, [isModerator, dispatch, fetchPatientCode, loadDoctors])
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        if (isModerator) {
            dispatch(fetchDoctorCode());
        } else {
            await fetchPatientCode();
            await loadDoctors();
        }
        setRefreshing(false);
    }, [dispatch, isModerator, fetchPatientCode, loadDoctors]);

    const handleAddDoctor = async () => {
        const trimUser = docUsername.trim().toLowerCase();
        const trimCode = docCode.trim().toUpperCase();
        if (!trimUser || trimCode.length !== 6) return;

        setSubmitting(true);
        const result = await dispatch(addDoctor({ username: trimUser, doctorCode: trimCode }));
        if (addDoctor.fulfilled.match(result)) {
            setDocUsername('');
            setDocCode('');
            setShowAddModal(false);
            Keyboard.dismiss();
            loadDoctors();
        } else {
            Alert.alert(t.error, (result.payload as string) ?? t.dcAddFailed);
        }
        setSubmitting(false);
    };

    const handleRemoveDoctor = (doctor: Doctor) => {
        Alert.alert(t.dcRemoveTitle, t.dcRemoveConfirm(doctor.displayName), [
            { text: t.cancel, style: 'cancel' },
            {
                text: t.remove, style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/api/family/remove/${encodeURIComponent(doctor.username)}`);
                        setDoctors(prev => prev.filter(d => d.username !== doctor.username));
                    } catch (e: any) {
                        Alert.alert(t.error, typeof e?.response?.data === 'string' ? e.response.data : t.dcRemoveFailed);
                    }
                },
            },
        ]);
    };

    if (isModerator) {
        return (
            <SafeAreaView style={styles.root}>
                <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { fontSize: fs(26), textAlign: isRTL ? 'right' : 'left' }]}>{t.doctorCenter}</Text>
                        <Text style={[styles.headerSub, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcModeratorSub}</Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1e3a8a" />}
                >
                    <Text style={[styles.sectionTitle, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcYourCode}</Text>
                    <CodeCard
                        label={t.dcDoctorCodeLabel}
                        sublabel={t.dcDoctorCodeSub}
                        code={doctorCode}
                        loading={doctorCodeLoading}
                        onRefresh={() => dispatch(refreshDoctorCode())}
                        fs={fs}
                        iconName="medkit-outline"
                        color="#0891b2"
                        t={t}
                    />

                    <View style={[styles.infoBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="people-outline" size={20} color="#1e3a8a" />
                        <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                            <Text style={[styles.infoBoxTitle, { fontSize: fs(14), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcManagePatients}</Text>
                            <Text style={[styles.infoBoxSub, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcManagePatientsDesc}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => router.push('/patients')}
                        style={[styles.goToBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="medkit-outline" size={18} color="#fff" />
                        <Text style={[styles.goToBtnText, { fontSize: fs(15), marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>{t.dcGoToPatients}</Text>
                    </TouchableOpacity>
                </ScrollView>
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
                    <Text style={[styles.headerTitle, { fontSize: fs(26), textAlign: isRTL ? 'right' : 'left' }]}>{t.doctorCenter}</Text>
                    <Text style={[styles.headerSub, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcPatientSub}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.7}>
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <Text style={[styles.addBtnText, { fontSize: fs(13), marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }]}>{t.add}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1e3a8a" />}
            >
                <Text style={[styles.sectionTitle, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcYourPatientCode}</Text>
                <CodeCard
                    label={t.dcPatientCodeLabel}
                    sublabel={t.dcPatientCodeSub}
                    code={patientCode}
                    loading={patientCodeLoading}
                    onRefresh={refreshPatientCode}
                    fs={fs}
                    iconName="person-outline"
                    color="#7c3aed"
                    t={t}
                />

                <Text style={[styles.sectionTitle, { fontSize: fs(11), marginTop: 24, textAlign: isRTL ? 'right' : 'left' }]}>{t.dcMyDoctors}</Text>

                {doctorsLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text style={[styles.subText, { fontSize: fs(14) }]}>{t.dcLoadingDoctors}</Text>
                    </View>
                ) : doctors.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="medkit-outline" size={36} color="#94a3b8" />
                        </View>
                        <Text style={[styles.emptyTitle, { fontSize: fs(16) }]}>{t.dcNoDoctors}</Text>
                        <Text style={[styles.emptySub, { fontSize: fs(13) }]}>{t.dcNoDoctorsDesc}</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.emptyBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.7}>
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                            <Text style={[styles.emptyBtnText, { fontSize: fs(14), marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>{t.dcAddDoctor}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    doctors.map(doc => (
                        <DoctorCard
                            key={doc.username}
                            doctor={doc}
                            onRemove={handleRemoveDoctor}
                            fs={fs}
                            isRTL={isRTL}
                        />
                    ))
                )}
            </ScrollView>

            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHandle} />
                            <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View>
                                    <Text style={[styles.modalTitle, { fontSize: fs(22), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcAddDoctor}</Text>
                                    <Text style={[styles.modalSub, { fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcAddDoctorSub}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => { setShowAddModal(false); setDocUsername(''); setDocCode(''); Keyboard.dismiss(); }}
                                    style={styles.closeBtn}
                                >
                                    <Ionicons name="close" size={18} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcDoctorUsernameLabel}</Text>
                            <View style={[styles.inputWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={[styles.input, { fontSize: fs(15), marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, textAlign: isRTL ? 'right' : 'left' }]}
                                    placeholder={t.dcDoctorUsernamePlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={docUsername}
                                    onChangeText={setDocUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                />
                            </View>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcDoctorCodeInputLabel}</Text>
                            <View style={[styles.inputWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Ionicons name="key-outline" size={18} color="#94a3b8" />
                                <TextInput
                                    style={[styles.input, { fontSize: fs(15), letterSpacing: 4, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, textAlign: isRTL ? 'right' : 'left' }]}
                                    placeholder={t.dcDoctorCodeInputPlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={docCode}
                                    onChangeText={t2 => setDocCode(t2.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    maxLength={6}
                                    returnKeyType="done"
                                    onSubmitEditing={handleAddDoctor}
                                />
                            </View>

                            <Text style={[styles.modalHint, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{t.dcAddDoctorHint}</Text>

                            {!!error && (
                                <Text style={[styles.errorText, { fontSize: fs(13) }]}>{error}</Text>
                            )}

                            <View style={[styles.modalBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <TouchableOpacity
                                    onPress={() => { setShowAddModal(false); setDocUsername(''); setDocCode(''); Keyboard.dismiss(); }}
                                    activeOpacity={0.7}
                                    style={styles.cancelBtn}
                                    disabled={submitting}
                                >
                                    <Text style={[styles.cancelBtnText, { fontSize: fs(15) }]}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleAddDoctor}
                                    activeOpacity={0.7}
                                    disabled={!docUsername.trim() || docCode.length !== 6 || submitting || loading}
                                    style={[styles.confirmBtn, {
                                        opacity: docUsername.trim() && docCode.length === 6 && !submitting && !loading ? 1 : 0.5,
                                    }]}
                                >
                                    {submitting || loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={[styles.confirmBtnText, { fontSize: fs(15) }]}>{t.dcAddDoctor}</Text>
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
    header: {
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20,
        flexDirection: 'row', alignItems: 'center',
    },
    headerTitle: { fontWeight: 'bold', color: '#172554' },
    headerSub: { color: '#94a3b8', marginTop: 2 },
    addBtn: {
        backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    addBtnText: { color: '#fff', fontWeight: 'bold' },
    scroll: { flex: 1, paddingHorizontal: 24 },
    sectionTitle: {
        color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase',
        letterSpacing: 1.5, marginBottom: 12,
    },
    codeCard: {
        backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 20,
        padding: 16, marginBottom: 12,
    },
    codeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    codeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    codeLabel: { fontWeight: 'bold' },
    codeSub: { color: '#94a3b8', marginTop: 1 },
    refreshBtn: { padding: 8 },
    codeDisplay: {
        backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 14,
        paddingHorizontal: 20, alignItems: 'center', marginBottom: 8,
    },
    codeText: { fontWeight: '900' },
    codeHint: { color: '#cbd5e1', textAlign: 'center' },
    infoBox: {
        backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
        borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start',
        marginBottom: 16,
    },
    infoBoxTitle: { fontWeight: 'bold', color: '#172554', marginBottom: 4 },
    infoBoxSub: { color: '#64748b', lineHeight: 18 },
    goToBtn: {
        backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    goToBtnText: { color: '#fff', fontWeight: 'bold' },
    doctorCard: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 20, marginBottom: 12,
    },
    doctorCardInner: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
    },
    doctorAvatar: {
        width: 52, height: 52, backgroundColor: '#e0f2fe',
        borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    },
    doctorAvatarText: { fontWeight: '900', color: '#0284c7' },
    doctorName: { fontWeight: 'bold', color: '#172554' },
    doctorUsername: { color: '#94a3b8', marginTop: 2 },
    doctorBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 999, marginTop: 4,
    },
    doctorBadgeText: { color: '#0891b2', fontWeight: 'bold' },
    removeBtn: { padding: 8 },
    centered: { alignItems: 'center', paddingVertical: 20 },
    subText: { color: '#94a3b8', fontWeight: '500', marginTop: 12 },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    emptyIconWrap: {
        width: 72, height: 72, backgroundColor: '#eff6ff',
        borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 },
    emptySub: { color: '#cbd5e1', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyBtn: {
        backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    emptyBtnText: { color: '#fff', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
    },
    modalHandle: {
        width: 48, height: 4, backgroundColor: '#e2e8f0',
        borderRadius: 999, alignSelf: 'center', marginBottom: 20,
    },
    modalHeaderRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
    },
    modalTitle: { fontWeight: 'bold', color: '#172554' },
    modalSub: { color: '#94a3b8', marginTop: 2 },
    closeBtn: {
        backgroundColor: '#f1f5f9', width: 36, height: 36,
        borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    },
    inputLabel: { color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    inputWrap: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
    },
    input: { flex: 1, fontWeight: '500', color: '#172554' },
    modalHint: { color: '#94a3b8', lineHeight: 18, marginBottom: 20 },
    errorText: { color: '#f87171', fontWeight: '500', marginBottom: 16 },
    modalBtnRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    confirmBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});