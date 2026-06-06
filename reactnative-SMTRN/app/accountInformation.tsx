import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
    fetchFamilyCode, refreshFamilyCode,
    fetchDoctorCode, refreshDoctorCode,
} from '../store/familySlice';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';
import api from '../services/api';

interface UserInfo {
    id: number;
    username: string;
    name: string;
    dateOfBirth?: string;
    roles?: Array<{ id: number; name: string }>;
}

function InfoRow({
                     label, value, fs, isRTL,
                 }: {
    label: string; value: string;
    fs: (n: number) => number; isRTL: boolean;
}) {
    return (
        <View style={[styles.infoRow, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.infoLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                {label}
            </Text>
            <Text style={[styles.infoValue, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]}>
                {value}
            </Text>
        </View>
    );
}

function CodeBlock({
                       label, sublabel, code, loading, onRefresh, fs, color, iconName, isRTL, codeFooterText,
                   }: {
    label: string; sublabel: string; code: string | null;
    loading: boolean; onRefresh: () => void;
    fs: (n: number) => number; color: string; iconName: any;
    isRTL: boolean; codeFooterText: string;
}) {
    return (
        <View style={[styles.codeBlock, { borderColor: color + '25' }]}>
            <View style={[styles.codeBlockHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.codeIcon, { backgroundColor: color + '15' }]}>
                    <Ionicons name={iconName} size={16} color={color} />
                </View>
                <View style={{
                    flex: 1,
                    marginLeft: isRTL ? 0 : 10,
                    marginRight: isRTL ? 10 : 0,
                    alignItems: isRTL ? 'flex-end' : 'flex-start',
                }}>
                    <Text style={[styles.codeBlockLabel, { fontSize: fs(13), color }]}>{label}</Text>
                    <Text style={[styles.codeBlockSub, { fontSize: fs(11) }]}>{sublabel}</Text>
                </View>
                <TouchableOpacity
                    onPress={onRefresh}
                    disabled={loading}
                    style={{ padding: 8, opacity: loading ? 0.5 : 1 }}
                    activeOpacity={0.7}
                >
                    {loading
                        ? <ActivityIndicator size="small" color={color} />
                        : <Ionicons name="refresh-outline" size={18} color={color} />
                    }
                </TouchableOpacity>
            </View>
            <View style={[styles.codeDisplay, { backgroundColor: color + '08' }]}>
                {loading && !code
                    ? <ActivityIndicator color={color} />
                    : <Text style={[styles.codeText, { fontSize: fs(28), color }]}>
                        {code ?? '------'}
                    </Text>
                }
            </View>
            <Text style={[styles.codeFooter, { fontSize: fs(10) }]}>{codeFooterText}</Text>
        </View>
    );
}

export default function AccountInformation() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const { name, username, roles } = useSelector((s: RootState) => s.auth);
    const { familyCode, familyCodeLoading, doctorCode, doctorCodeLoading } =
        useSelector((s: RootState) => s.family);

    const isModerator = (roles ?? []).includes('ROLE_MODERATOR') || (roles ?? []).includes('ROLE_ADMIN');

    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);

    useEffect(() => {
        dispatch(fetchFamilyCode());
        if (isModerator) dispatch(fetchDoctorCode());
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        setLoadingInfo(true);
        try {
            const res = await api.get<UserInfo>('/api/test/whoami');
            setUserInfo(res.data);
        } catch {
            // fall back to redux state
        } finally {
            setLoadingInfo(false);
        }
    };

    const getRoleDisplay = () => {
        if (!roles || roles.length === 0) return t.patient;
        const r = roles[0];
        if (r === 'ROLE_MODERATOR') return t.doctor;
        if (r === 'ROLE_ADMIN')     return t.admin;
        if (r === 'ROLE_USER')      return t.patient;
        return r.replace('ROLE_', '');
    };

    const displayName = userInfo?.name
        ? userInfo.name.charAt(0).toUpperCase() + userInfo.name.slice(1)
        : (name ?? 'Unknown');

    const displayUsername = userInfo?.username ?? username ?? '—';


    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { fontSize: fs(26) }]}>{t.accountInfoTitle}</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={44} color="#1e3a8a" />
                    </View>
                    <Text style={[styles.avatarName, { fontSize: fs(22) }]}>{displayName}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={[styles.roleText, { fontSize: fs(12) }]}>{getRoleDisplay()}</Text>
                    </View>
                </View>

                {/* Account details */}
                <Text style={[styles.sectionTitle, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.accountDetails}
                </Text>
                <View style={styles.card}>
                    {loadingInfo ? (
                        <ActivityIndicator color="#1e3a8a" style={{ paddingVertical: 20 }} />
                    ) : (
                        <>
                            <InfoRow label={t.fullName}      value={displayName}      fs={fs} isRTL={isRTL} />
                            <View style={styles.divider} />
                            <InfoRow label={t.emailUsername} value={displayUsername}  fs={fs} isRTL={isRTL} />
                            <View style={styles.divider} />
                            <InfoRow label={t.role}          value={getRoleDisplay()}  fs={fs} isRTL={isRTL} />
                            {userInfo?.dateOfBirth && (
                                <>
                                    <View style={styles.divider} />
                                    <InfoRow label={t.dateOfBirth} value={userInfo.dateOfBirth} fs={fs} isRTL={isRTL} />
                                </>
                            )}
                        </>
                    )}
                </View>

                {/* Sharing codes */}
                <Text style={[styles.sectionTitle, { fontSize: fs(11), marginTop: 24, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.sharingCodes}
                </Text>
                <Text style={[styles.sectionDesc, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.sharingCodesDesc}
                </Text>

                <CodeBlock
                    label={t.familyCodeLabel}
                    sublabel={t.familyCodeSub}
                    code={familyCode}
                    loading={familyCodeLoading}
                    onRefresh={() => dispatch(refreshFamilyCode())}
                    fs={fs}
                    color="#2563eb"
                    iconName="people-outline"
                    isRTL={isRTL}
                    codeFooterText={t.codeFooter}
                />

                {isModerator && (
                    <CodeBlock
                        label={t.patientCodeLabel2}
                        sublabel={t.patientCodeSub}
                        code={doctorCode}
                        loading={doctorCodeLoading}
                        onRefresh={() => dispatch(refreshDoctorCode())}
                        fs={fs}
                        color="#0891b2"
                        iconName="medkit-outline"
                        isRTL={isRTL}
                        codeFooterText={t.codeFooter}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20,
        alignItems: 'center',
    },
    headerTitle: { fontWeight: 'bold', color: '#172554' },
    scroll: { flex: 1, paddingHorizontal: 24 },
    avatarSection: { alignItems: 'center', paddingVertical: 24 },
    avatar: {
        width: 96, height: 96, backgroundColor: '#dbeafe',
        borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    avatarName: { fontWeight: 'bold', color: '#172554' },
    roleBadge: {
        marginTop: 6, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
        paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999,
    },
    roleText: { color: '#1d4ed8', fontWeight: '600' },
    sectionTitle: {
        color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase',
        letterSpacing: 1.5, marginBottom: 10,
    },
    sectionDesc: { color: '#94a3b8', marginBottom: 14, lineHeight: 18 },
    card: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 20, overflow: 'hidden',
    },
    infoRow: { paddingHorizontal: 16, paddingVertical: 14 },
    infoLabel: {
        color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase',
        letterSpacing: 0.8, marginBottom: 4,
    },
    infoValue: { fontWeight: '600', color: '#172554' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
    codeBlock: {
        backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 20,
        padding: 16, marginBottom: 12,
    },
    codeBlockHeader: { alignItems: 'center', marginBottom: 12 },
    codeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    codeBlockLabel: { fontWeight: 'bold' },
    codeBlockSub: { color: '#94a3b8', marginTop: 1 },
    codeDisplay: {
        borderRadius: 12, paddingVertical: 16, alignItems: 'center',
        marginBottom: 8, minHeight: 60, justifyContent: 'center',
    },
    codeText: { fontWeight: '900', letterSpacing: 10 },
    codeFooter: { color: '#cbd5e1', textAlign: 'center' },
});