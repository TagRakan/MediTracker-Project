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
    addFamilyMember, removeFamilyMember, checkFamilyDoses,
    checkFamilyPastDoses, clearMemberDoses, FamilyMember,
    fetchFamilyMembers, fetchFamilyCode, refreshFamilyCode,
} from '../store/familySlice';
import { BackendDose, BackendPastDose } from '../services/api';
import { formatTime, parseBackendTime } from './utils/doseHelpers';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';
import Toast from 'react-native-toast-message';

const RELATIONSHIP_OPTIONS = ['SIBLING', 'PARENT', 'CHILD', 'SPOUSE', 'OTHER'] as const;
type RelationshipType = typeof RELATIONSHIP_OPTIONS[number];

const RELATIONSHIP_ICONS: Record<RelationshipType, string> = {
    SIBLING: 'people-outline',
    PARENT: 'person-outline',
    CHILD: 'happy-outline',
    SPOUSE: 'home-outline',
    OTHER: 'ellipsis-horizontal-circle-outline',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, { bg: string; text: string; border: string }> = {
    SIBLING:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    PARENT:   { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
    CHILD:    { bg: '#fef9c3', text: '#a16207', border: '#fde68a' },
    SPOUSE:   { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
    OTHER:    { bg: '#e2e8f0', text: '#0f172a', border: '#64748b' },
};

type FilterType = RelationshipType | 'ALL';

function statusColor(name: string): string {
    switch (name) {
        case 'TAKEN': return '#16a34a';
        case 'TAKEN_EARLY': return '#2563eb';
        case 'TAKEN_LATE': return '#f97316';
        case 'SKIPPED': return '#94a3b8';
        case 'MISSED': return '#ef4444';
        default: return '#94a3b8';
    }
}

function statusBg(name: string): string {
    switch (name) {
        case 'TAKEN': return '#dcfce7';
        case 'TAKEN_EARLY': return '#dbeafe';
        case 'TAKEN_LATE': return '#ffedd5';
        case 'SKIPPED': return '#f1f5f9';
        case 'MISSED': return '#fee2e2';
        default: return '#f1f5f9';
    }
}

function statusLabel(name: string): string {
    return name.replace(/_/g, ' ');
}

function RelationshipBadge({ type, fs, relationshipLabels }: {
    type: string;
    fs: (n: number) => number;
    relationshipLabels: Record<RelationshipType, string>;
}) {
    const key = (RELATIONSHIP_OPTIONS as readonly string[]).includes(type)
        ? (type as RelationshipType)
        : 'OTHER';
    const colors = RELATIONSHIP_COLORS[key];
    const label = relationshipLabels[key] ?? type;
    const icon = RELATIONSHIP_ICONS[key];

    return (
        <View style={[styles.relBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Ionicons name={icon as any} size={10} color={colors.text} />
            <Text style={[styles.relBadgeText, { fontSize: fs(10), color: colors.text }]}>{label}</Text>
        </View>
    );
}

function DoseRow({ dose, fs }: { dose: BackendDose; fs: (n: number) => number }) {
    const time = parseBackendTime(dose.localTime);
    const displayTime = formatTime(time);
    const dayLabel = dose.doseDay.charAt(0) + dose.doseDay.slice(1).toLowerCase();

    return (
        <View style={styles.doseRow}>
            <View style={styles.doseRowInner}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.doseMedName, { fontSize: fs(15) }]}>
                        {dose.medicine?.name ?? dose.name}
                    </Text>
                    <Text style={[styles.doseName, { fontSize: fs(11) }]}>{dose.name}</Text>
                </View>
                <View style={styles.doseRightCol}>
                    <View style={styles.doseTimeBadge}>
                        <Text style={[styles.doseTimeBadgeText, { fontSize: fs(10) }]}>{displayTime}</Text>
                    </View>
                    <Text style={[styles.doseDayMg, { fontSize: fs(10) }]}>
                        {dayLabel} · {dose.doseInMilligram}mg
                    </Text>
                </View>
            </View>
        </View>
    );
}

function PastDoseRow({ record, fs }: { record: BackendPastDose; fs: (n: number) => number }) {
    const statusName = record.doseStatus?.name ?? 'NONE';
    if (statusName === 'NONE' || statusName === 'PENDING') return null;

    const dose = record.dose;
    const medName = dose?.medicine?.name ?? dose?.name ?? '—';
    const doseName = dose?.name ?? '';
    const mg = dose?.doseInMilligram ?? 0;

    let dateLabel = '—';
    try {
        const dt = new Date(record.date);
        dateLabel = dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
            + ' · '
            + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { }

    const color = statusColor(statusName);
    const bg = statusBg(statusName);

    return (
        <View style={[styles.pastDoseRow, { borderLeftColor: color }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.doseMedName, { fontSize: fs(14) }]}>{medName}</Text>
                {!!doseName && doseName !== medName && (
                    <Text style={[styles.doseName, { fontSize: fs(11) }]}>{doseName}</Text>
                )}
                <Text style={[styles.doseDayMg, { fontSize: fs(11), marginTop: 2 }]}>{dateLabel}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.statusBadgeText, { fontSize: fs(10), color }]}>
                        {statusLabel(statusName)}
                    </Text>
                </View>
                {mg > 0 && (
                    <Text style={[styles.doseDayMg, { fontSize: fs(10) }]}>{mg}mg</Text>
                )}
            </View>
        </View>
    );
}

function MemberDosesModal({ member, visible, onClose }: {
    member: FamilyMember; visible: boolean; onClose: () => void;
}) {
    const dispatch = useDispatch<AppDispatch>();
    const { memberDoses, memberDosesLoading, memberPastDoses, memberPastDosesLoading, error } =
        useSelector((s: RootState) => s.family);
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

    const loadCurrent = useCallback(() => {
        dispatch(checkFamilyDoses(member.username));
    }, [member.username, dispatch]);

    const loadHistory = useCallback(() => {
        dispatch(checkFamilyPastDoses(member.username));
    }, [member.username, dispatch]);

    React.useEffect(() => {
        if (visible) {
            dispatch(clearMemberDoses());
            setActiveTab('current');
            loadCurrent();
        } else {
            dispatch(clearMemberDoses());
        }
    }, [visible]);

    React.useEffect(() => {
        if (visible && activeTab === 'history' && memberPastDoses === null && !memberPastDosesLoading) {
            loadHistory();
        }
    }, [activeTab, visible]);

    const activeDoses = (memberDoses ?? []).filter(d => d.isActive !== false);

    const filteredPastDoses = (memberPastDoses ?? []).filter(r => {
        const n = r.doseStatus?.name ?? '';
        return n !== 'NONE' && n !== 'PENDING' && n !== '';
    });

    const relType = member.relationshipType ?? 'OTHER';

    const relationshipLabels: Record<RelationshipType, string> = {
        SIBLING: t.fcRelSibling,
        PARENT:  t.fcRelParent,
        CHILD:   t.fcRelChild,
        SPOUSE:  t.fcRelSpouse,
        OTHER:   t.fcRelOther,
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />

                    <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text style={[styles.modalMemberName, { fontSize: fs(22) }]}>{member.displayName}</Text>
                                <RelationshipBadge type={relType} fs={fs} relationshipLabels={relationshipLabels} />
                            </View>
                            <Text style={[styles.modalMemberUsername, { fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }]}>{member.username}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                            <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('current')}
                            style={[styles.tab, activeTab === 'current' && styles.tabActive]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="medical-outline"
                                size={14}
                                color={activeTab === 'current' ? '#1e3a8a' : '#94a3b8'}
                            />
                            <Text style={[styles.tabText, { fontSize: fs(13) }, activeTab === 'current' && styles.tabTextActive]}>
                                {t.fcDoses}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('history')}
                            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="time-outline"
                                size={14}
                                color={activeTab === 'history' ? '#1e3a8a' : '#94a3b8'}
                            />
                            <Text style={[styles.tabText, { fontSize: fs(13) }, activeTab === 'history' && styles.tabTextActive]}>
                                {t.fcHistory}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'current' && (
                        <>
                            {memberDosesLoading ? (
                                <View style={styles.centered}>
                                    <ActivityIndicator size="large" color="#1e3a8a" />
                                    <Text style={[styles.subText, { fontSize: fs(14) }]}>{t.loadingDoses}</Text>
                                </View>
                            ) : error && !memberDoses ? (
                                <View style={styles.centered}>
                                    <Ionicons name="alert-circle-outline" size={40} color="#fca5a5" />
                                    <Text style={[styles.errorText, { fontSize: fs(13) }]}>{error}</Text>
                                    <TouchableOpacity onPress={loadCurrent} style={styles.retryBtn} activeOpacity={0.7}>
                                        <Text style={[styles.retryBtnText, { fontSize: fs(13) }]}>{t.retry}</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : activeDoses.length === 0 ? (
                                <View style={styles.centered}>
                                    <Ionicons name="medical-outline" size={40} color="#cbd5e1" />
                                    <Text style={[styles.subText, { fontSize: fs(14) }]}>{t.fcNoDoses}</Text>
                                </View>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    {activeDoses.map((dose, index) => (
                                        <DoseRow key={`dose-${dose.id}-${index}`} dose={dose} fs={fs} />
                                    ))}
                                </ScrollView>
                            )}
                            {!memberDosesLoading && !!memberDoses && (
                                <TouchableOpacity onPress={loadCurrent} style={styles.refreshRow} activeOpacity={0.7}>
                                    <Ionicons name="refresh" size={16} color="#94a3b8" />
                                    <Text style={[styles.refreshText, { fontSize: fs(13) }]}>{t.fcRefresh}</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {activeTab === 'history' && (
                        <>
                            {memberPastDosesLoading ? (
                                <View style={styles.centered}>
                                    <ActivityIndicator size="large" color="#1e3a8a" />
                                    <Text style={[styles.subText, { fontSize: fs(14) }]}>{t.histLoading}</Text>
                                </View>
                            ) : filteredPastDoses.length === 0 && !memberPastDosesLoading ? (
                                <View style={styles.centered}>
                                    <Ionicons name="time-outline" size={40} color="#cbd5e1" />
                                    <Text style={[styles.subText, { fontSize: fs(14) }]}>{t.fcNoHistory}</Text>
                                </View>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                                    {filteredPastDoses.map((record, index) => (
                                        <PastDoseRow key={`past-${record.id}-${index}`} record={record} fs={fs} />
                                    ))}
                                </ScrollView>
                            )}
                            {!memberPastDosesLoading && (
                                <TouchableOpacity onPress={loadHistory} style={styles.refreshRow} activeOpacity={0.7}>
                                    <Ionicons name="refresh" size={16} color="#94a3b8" />
                                    <Text style={[styles.refreshText, { fontSize: fs(13) }]}>{t.fcRefresh}</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

export default function FamilyCenter() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { members, loading, error, familyCode, familyCodeLoading } = useSelector((s: RootState) => s.family);
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const relationshipLabels: Record<RelationshipType, string> = {
        SIBLING: t.fcRelSibling,
        PARENT:  t.fcRelParent,
        CHILD:   t.fcRelChild,
        SPOUSE:  t.fcRelSpouse,
        OTHER:   t.fcRelOther,
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [username, setUsername] = useState('');
    const [familyCodeInput, setFamilyCodeInput] = useState('');
    const [relationship, setRelationship] = useState<RelationshipType>('OTHER');
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchFamilyMembers());
            dispatch(fetchFamilyCode());
        }, [dispatch])
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchFamilyMembers()),
                dispatch(fetchFamilyCode()),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const handleAdd = async () => {
        const trimmedUser = username.trim().toLowerCase();
        const trimmedCode = familyCodeInput.trim().toUpperCase();
        if (!trimmedUser || !trimmedCode) return;

        const result = await dispatch(addFamilyMember({
            username: trimmedUser,
            familyCode: trimmedCode,
            relationship,
        }));
        if (addFamilyMember.fulfilled.match(result)) {
            setUsername('');
            setFamilyCodeInput('');
            setRelationship('OTHER');
            setShowAddModal(false);
            Keyboard.dismiss();
            dispatch(fetchFamilyMembers());
            Toast.show({
                type: 'success',
                text1: t.toastFamilyMemberAdded,
                text2: `${trimmedUser} ${t.toastFamilyMemberAddedSub}`,
                position: 'bottom',
                visibilityTime: 3000,
            });
        } else {
            Alert.alert(t.error, (result.payload as string) ?? t.fcAddFailed);
        }
    };

    const handleRemove = (member: FamilyMember) => {
        Alert.alert(t.fcRemoveMember, t.fcRemoveConfirm(member.displayName), [
            { text: t.cancel, style: 'cancel' },
            {
                text: t.remove, style: 'destructive',
                onPress: async () => {
                    await dispatch(removeFamilyMember(member.username));
                    Toast.show({
                        type: 'success',
                        text1: t.toastFamilyMemberRemoved,
                        text2: `${member.displayName} ${t.toastFamilyMemberRemovedSub}`,
                        position: 'bottom',
                        visibilityTime: 3000,
                    });
                },

            },
        ]);
    };

    const relCounts: Partial<Record<RelationshipType, number>> = {};
    for (const m of members) {
        const k = (m.relationshipType ?? 'OTHER') as RelationshipType;
        relCounts[k] = (relCounts[k] ?? 0) + 1;
    }

    const presentRelTypes = RELATIONSHIP_OPTIONS.filter(r => (relCounts[r] ?? 0) > 0);
    const filteredMembers = activeFilter === 'ALL'
        ? members
        : members.filter(m => (m.relationshipType ?? 'OTHER') === activeFilter);

    const filterOptions: FilterType[] = ['ALL', ...presentRelTypes];

    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
                    >
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { fontSize: fs(26), textAlign: isRTL ? 'right' : 'left' }]}>
                            {t.fcTitle}
                        </Text>
                        {members.length > 0 && (
                            <Text style={[styles.headerSub, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.fcMembers(members.length)}
                            </Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn} activeOpacity={0.7}>
                    <Text style={[styles.addBtnText, { fontSize: fs(13) }]}>{t.fcAddBtn}</Text>
                </TouchableOpacity>
            </View>

            {/* Family Code Banner — matches AccountInformation CodeBlock style */}
            <View style={[styles.familyCodeBlock, { borderColor: '#2563eb' + '25', marginHorizontal: 24, marginBottom: 14 }]}>
                <View style={[styles.familyCodeBlockHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.familyCodeIcon, { backgroundColor: '#2563eb' + '15' }]}>
                        <Ionicons name="people-outline" size={16} color="#2563eb" />
                    </View>
                    <View style={{
                        flex: 1,
                        marginLeft: isRTL ? 0 : 10,
                        marginRight: isRTL ? 10 : 0,
                        alignItems: isRTL ? 'flex-end' : 'flex-start',
                    }}>
                        <Text style={[styles.familyCodeBlockLabel, { fontSize: fs(13), color: '#2563eb' }]}>
                            {t.familyCodeLabel}
                        </Text>
                        <Text style={[styles.familyCodeBlockSub, { fontSize: fs(11) }]}>
                            {t.familyCodeSub}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => dispatch(refreshFamilyCode())}
                        disabled={familyCodeLoading}
                        style={{ padding: 8, opacity: familyCodeLoading ? 0.5 : 1 }}
                        activeOpacity={0.7}
                    >
                        {familyCodeLoading
                            ? <ActivityIndicator size="small" color="#2563eb" />
                            : <Ionicons name="refresh-outline" size={18} color="#2563eb" />
                        }
                    </TouchableOpacity>
                </View>
                <View style={[styles.familyCodeDisplay, { backgroundColor: '#2563eb' + '08' }]}>
                    {familyCodeLoading && !familyCode
                        ? <ActivityIndicator color="#2563eb" />
                        : <Text style={[styles.familyCodeText, { fontSize: fs(28), color: '#2563eb' }]}>
                            {familyCode ?? '------'}
                        </Text>
                    }
                </View>
                <Text style={[styles.familyCodeFooter, { fontSize: fs(10) }]}>{t.codeFooter}</Text>
            </View>

            {/* Filter chips */}
            {members.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
                >
                    {filterOptions.map(opt => {
                        const active = activeFilter === opt;
                        const isAll = opt === 'ALL';
                        const colors = isAll
                            ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
                            : RELATIONSHIP_COLORS[opt as RelationshipType] ?? RELATIONSHIP_COLORS.OTHER;
                        const count = isAll
                            ? members.length
                            : relCounts[opt as RelationshipType] ?? 0;

                        return (
                            <TouchableOpacity
                                key={opt}
                                onPress={() => setActiveFilter(opt)}
                                activeOpacity={0.7}
                                style={[
                                    styles.filterChip,
                                    active && { backgroundColor: colors.bg, borderColor: colors.border },
                                ]}
                            >
                                {!isAll && (
                                    <Ionicons
                                        name={RELATIONSHIP_ICONS[opt as RelationshipType] as any}
                                        size={12}
                                        color={active ? colors.text : '#94a3b8'}
                                    />
                                )}
                                <Text style={[
                                    styles.filterChipText,
                                    { fontSize: fs(12), color: active ? colors.text : '#94a3b8' },
                                ]}>
                                    {isAll ? t.filterAll : relationshipLabels[opt as RelationshipType]}
                                    {` (${count})`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* Members list */}
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1e3a8a" />}
            >
                {loading && members.length === 0 ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#1e3a8a" />
                    </View>
                ) : members.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={52} color="#94a3b8" />
                        <Text style={[styles.emptyTitle, { fontSize: fs(17), textAlign: isRTL ? 'right' : 'left' }]}>
                            {t.fcNoMembers}
                        </Text>
                        <Text style={[styles.emptySubText, { fontSize: fs(13) }]}>
                            {t.fcNoMembersDesc}
                        </Text>
                    </View>
                ) : filteredMembers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="filter-outline" size={40} color="#94a3b8" />
                        <Text style={[styles.emptyTitle, { fontSize: fs(17) }]}>{t.fcNoInCategory}</Text>
                    </View>
                ) : (
                    <View>
                        {filteredMembers.map((member, index) => {
                            const relType = member.relationshipType ?? 'OTHER';
                            const relKey = (RELATIONSHIP_OPTIONS as readonly string[]).includes(relType)
                                ? (relType as RelationshipType)
                                : 'OTHER';
                            const colors = RELATIONSHIP_COLORS[relKey];

                            return (
                                <TouchableOpacity
                                    key={`member-${member.username || index}-${index}`}
                                    style={[styles.memberCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedMember(member)}
                                >
                                    {/* Avatar */}
                                    <View style={[
                                        styles.memberAvatar,
                                        {
                                            backgroundColor: colors.bg,
                                            marginRight: isRTL ? 0 : 12,
                                            marginLeft: isRTL ? 12 : 0,
                                        },
                                    ]}>
                                        <Ionicons
                                            name={RELATIONSHIP_ICONS[relKey] as any}
                                            size={22}
                                            color={colors.text}
                                        />
                                    </View>

                                    {/* Name + username + badge */}
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <Text style={[styles.memberName, { fontSize: fs(16), textAlign: isRTL ? 'right' : 'left' }]}>
                                                {member.displayName}
                                            </Text>
                                            <RelationshipBadge type={relType} fs={fs} relationshipLabels={relationshipLabels} />
                                        </View>
                                        <Text style={[styles.memberUsername, { fontSize: fs(12), textAlign: isRTL ? 'right' : 'left' }]}>
                                            {member.username}
                                        </Text>
                                    </View>

                                    {/* Doses badge + trash */}
                                    <View style={[styles.memberCardRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                        <View style={styles.viewDosesBadge}>
                                            <Text style={[styles.viewDosesText, { fontSize: fs(11) }]}>{t.fcDosesHistory}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); handleRemove(member); }}
                                            activeOpacity={0.7}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Member doses modal */}
            {selectedMember && (
                <MemberDosesModal
                    member={selectedMember}
                    visible={!!selectedMember}
                    onClose={() => { setSelectedMember(null); dispatch(clearMemberDoses()); }}
                />
            )}

            {/* Add member modal */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.addModalSheet}>
                            <Text style={[styles.addModalTitle, { fontSize: fs(22), textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.fcAddMember}
                            </Text>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.fcUsernameLabel}
                            </Text>
                            <View style={[styles.inputWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <TextInput
                                    style={[styles.input, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]}
                                    placeholder={t.fcUsernamePlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                />
                            </View>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.fcCodeLabel}
                            </Text>
                            <View style={[styles.inputWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <TextInput
                                    style={[styles.input, { fontSize: fs(15), letterSpacing: 4, textAlign: isRTL ? 'right' : 'left' }]}
                                    placeholder={t.fcCodePlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    value={familyCodeInput}
                                    onChangeText={v => setFamilyCodeInput(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    maxLength={6}
                                    returnKeyType="done"
                                />
                            </View>

                            <Text style={[styles.inputLabel, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.fcRelationshipLabel}
                            </Text>
                            <View style={[styles.relationshipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                {RELATIONSHIP_OPTIONS.map((rel) => {
                                    const active = relationship === rel;
                                    const colors = RELATIONSHIP_COLORS[rel];
                                    return (
                                        <TouchableOpacity
                                            key={`rel-${rel}`}
                                            onPress={() => setRelationship(rel)}
                                            activeOpacity={0.7}
                                            style={[
                                                styles.relChip,
                                                active && { backgroundColor: colors.bg, borderColor: colors.border },
                                            ]}
                                        >
                                            <Ionicons
                                                name={RELATIONSHIP_ICONS[rel] as any}
                                                size={12}
                                                color={active ? colors.text : '#94a3b8'}
                                            />
                                            <Text style={[
                                                styles.relChipText,
                                                { fontSize: fs(12) },
                                                active && { color: colors.text },
                                            ]}>
                                                {relationshipLabels[rel]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.codeHint, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.fcCodeHint}
                            </Text>

                            {!!error && (
                                <Text style={[styles.errorText, { fontSize: fs(13), marginBottom: 16 }]}>{error}</Text>
                            )}

                            <View style={[styles.modalBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowAddModal(false);
                                        setUsername('');
                                        setFamilyCodeInput('');
                                        setRelationship('OTHER');
                                        Keyboard.dismiss();
                                    }}
                                    activeOpacity={0.7}
                                    style={styles.cancelBtn}
                                >
                                    <Text style={[styles.cancelBtnText, { fontSize: fs(15) }]}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleAdd}
                                    activeOpacity={0.7}
                                    disabled={!username.trim() || familyCodeInput.length !== 6 || loading}
                                    style={[styles.confirmBtn, {
                                        opacity: username.trim() && familyCodeInput.length === 6 && !loading ? 1 : 0.5,
                                    }]}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={[styles.confirmBtnText, { fontSize: fs(15) }]}>{t.fcAddMemberBtn}</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontWeight: 'bold', color: '#172554' },
    headerSub: { color: '#94a3b8', marginTop: 1 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
    addBtnText: { color: '#ffffff', fontWeight: 'bold' },

    // ── Family code block (mirrors AccountInformation CodeBlock) ────────────
    familyCodeBlock: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderRadius: 20,
        padding: 16,
    },
    familyCodeBlockHeader: { alignItems: 'center', marginBottom: 12 },
    familyCodeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    familyCodeBlockLabel: { fontWeight: 'bold' },
    familyCodeBlockSub: { color: '#94a3b8', marginTop: 1 },
    familyCodeDisplay: {
        borderRadius: 12, paddingVertical: 16, alignItems: 'center',
        marginBottom: 8, minHeight: 60, justifyContent: 'center',
    },
    familyCodeText: { fontWeight: '900', letterSpacing: 10 },
    familyCodeFooter: { color: '#cbd5e1', textAlign: 'center' },
    // ────────────────────────────────────────────────────────────────────────

    filterScroll: { maxHeight: 48, marginBottom: 12 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
        borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    },
    filterChipText: { fontWeight: '700' },
    scroll: { flex: 1, paddingHorizontal: 24 },
    centered: { alignItems: 'center', paddingVertical: 40 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 20 },
    emptyTitle: { color: '#94a3b8', fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: '#cbd5e1', marginTop: 8, textAlign: 'center', lineHeight: 20 },
    memberCard: {
        backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 16, padding: 16, marginBottom: 12,
        alignItems: 'center', justifyContent: 'space-between',
    },
    memberAvatar: {
        width: 48, height: 48,
        borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    },
    memberName: { fontWeight: 'bold', color: '#172554' },
    memberUsername: { color: '#94a3b8', marginTop: 2 },
    memberCardRight: { alignItems: 'center', gap: 8 },
    viewDosesBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    viewDosesText: { color: '#1d4ed8', fontWeight: '600' },
    relBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
        borderWidth: 1,
    },
    relBadgeText: { fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 24, maxHeight: '85%',
    },
    modalHandle: {
        width: 48, height: 4, backgroundColor: '#e2e8f0',
        borderRadius: 999, alignSelf: 'center', marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16,
    },
    modalMemberName: { fontWeight: 'bold', color: '#172554' },
    modalMemberUsername: { color: '#94a3b8' },
    modalCloseBtn: {
        backgroundColor: '#f1f5f9', width: 40, height: 40,
        borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 12,
    },
    tabRow: {
        flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12,
        padding: 4, marginBottom: 16,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, borderRadius: 10, gap: 6,
    },
    tabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    tabText: { color: '#94a3b8', fontWeight: '600' },
    tabTextActive: { color: '#1e3a8a', fontWeight: '700' },
    doseRow: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
        borderRadius: 16, padding: 16, marginBottom: 8,
    },
    doseRowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    doseMedName: { fontWeight: 'bold', color: '#172554' },
    doseName: { color: '#94a3b8', marginTop: 2 },
    doseRightCol: { alignItems: 'flex-end', gap: 4 },
    doseTimeBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 2 },
    doseTimeBadgeText: { color: '#1e3a8a', fontWeight: 'bold' },
    doseDayMg: { color: '#94a3b8' },
    pastDoseRow: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
        borderLeftWidth: 3, borderRadius: 16, padding: 16, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusBadgeText: { fontWeight: '700', textTransform: 'capitalize' },
    subText: { color: '#94a3b8', fontWeight: '500', marginTop: 12 },
    errorText: { color: '#f87171', fontWeight: '500', marginTop: 12, textAlign: 'center', paddingHorizontal: 16 },
    retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 999 },
    retryBtnText: { color: '#ffffff', fontWeight: 'bold' },
    refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 8 },
    refreshText: { color: '#94a3b8', fontWeight: '500', marginLeft: 4 },
    addModalSheet: {
        backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
    },
    addModalTitle: { fontWeight: 'bold', color: '#172554', marginBottom: 24 },
    inputLabel: { color: '#94a3b8', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    inputWrap: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
    },
    input: { fontWeight: '500', color: '#172554', flex: 1 },
    relationshipRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
    },
    relChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    },
    relChipText: { color: '#64748b', fontWeight: '600' },
    codeHint: { color: '#94a3b8', marginBottom: 20, lineHeight: 18 },
    modalBtnRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    confirmBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    confirmBtnText: { color: '#ffffff', fontWeight: 'bold' },
});