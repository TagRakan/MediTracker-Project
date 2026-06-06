import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api, { BackendPastDose, BackendDose } from '../services/api';
import { useFontScale } from '../context/FontContext';
import { useTranslation } from '../context/useTranslation';

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

function groupByDate(records: BackendPastDose[]): Record<string, BackendPastDose[]> {
    return records.reduce<Record<string, BackendPastDose[]>>((acc, r) => {
        const dateKey = r.date ? r.date.split('T')[0] : 'Unknown';
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(r);
        return acc;
    }, {});
}

function formatGroupDate(dateKey: string, t: any): string {
    if (dateKey === 'Unknown') return t.histUnknownDate;
    try {
        const dt = new Date(dateKey + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (dt.toDateString() === today.toDateString()) return t.today;
        if (dt.toDateString() === yesterday.toDateString()) return t.histYesterday;
        return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch {
        return dateKey;
    }
}

function toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const JS_DAY_TO_JAVA = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const LOOK_BACK_DAYS = 30;

function synthesizeMissedDoses(
    activeDoses: BackendDose[],
    realRecords: BackendPastDose[],
): BackendPastDose[] {
    const takenOrSkippedKeys = new Set<string>();
    for (const r of realRecords) {
        if (!r.dose?.id || !r.date) continue;
        const dateStr = r.date.split('T')[0];
        takenOrSkippedKeys.add(`${r.dose.id}_${dateStr}`);
    }

    const now = Date.now();
    const missed: BackendPastDose[] = [];
    let syntheticId = -1;

    for (let daysAgo = 1; daysAgo <= LOOK_BACK_DAYS; daysAgo++) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const dateStr = toLocalDateString(d);
        const javaDayOfWeek = JS_DAY_TO_JAVA[d.getDay()];

        for (const dose of activeDoses) {
            if (dose.doseDay !== javaDayOfWeek) continue;
            if (dose.startDate && dose.startDate > dateStr) continue;
            if (dose.endDate && dose.endDate < dateStr) continue;

            const key = `${dose.id}_${dateStr}`;
            if (takenOrSkippedKeys.has(key)) continue;

            const [hh, mm] = dose.localTime.split(':').map(Number);
            const scheduledAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0).getTime();

            if (scheduledAt > now) continue;

            missed.push({
                id: syntheticId--,
                date: `${dateStr}T${dose.localTime}`,
                doseStatus: { id: -1, name: 'MISSED' },
                dose,
            });
        }
    }

    return missed;
}

const FILTER_OPTIONS = ['ALL', 'TAKEN', 'TAKEN_EARLY', 'TAKEN_LATE', 'SKIPPED', 'MISSED'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

export default function History() {
    const router = useRouter();
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const [records, setRecords] = useState<BackendPastDose[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

    const filterLabels: Record<FilterOption, string> = {
        ALL: t.histFilterAll,
        TAKEN: t.statusTaken,
        TAKEN_EARLY: t.histFilterEarly,
        TAKEN_LATE: t.histFilterLate,
        SKIPPED: t.statusSkipped,
        MISSED: t.statusMissed,
    };

    function statusLabel(name: string): string {
        return filterLabels[name as FilterOption] ?? name.replace(/_/g, ' ');
    }

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pastRes, activeRes] = await Promise.all([
                api.get<BackendPastDose[]>('/api/pastdoses/self'),
                api.get<BackendDose[]>('/api/dose/getactive'),
            ]);

            const realRecords: BackendPastDose[] = (() => {
                if (pastRes.status === 204 || !pastRes.data) return [];
                return (Array.isArray(pastRes.data) ? pastRes.data : []).filter(r => {
                    const n = r.doseStatus?.name ?? '';
                    return !['NONE', 'PENDING', ''].includes(n);
                });
            })();

            const activeDoses: BackendDose[] = (() => {
                if (activeRes.status === 204 || !activeRes.data) return [];
                return Array.isArray(activeRes.data) ? activeRes.data : [];
            })();

            const missedDoses = synthesizeMissedDoses(activeDoses, realRecords);

            const all = [...realRecords, ...missedDoses];
            all.sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return b.date.localeCompare(a.date);
            });

            setRecords(all);
        } catch (e: any) {
            setError(typeof e?.response?.data === 'string'
                ? e.response.data
                : t.histLoadError);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

    const filtered = activeFilter === 'ALL'
        ? records
        : records.filter(r => r.doseStatus?.name === activeFilter);

    const grouped = groupByDate(filtered);
    const sortedDateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    const counts: Record<string, number> = {};
    for (const r of records) {
        const n = r.doseStatus?.name ?? 'OTHER';
        counts[n] = (counts[n] ?? 0) + 1;
    }

    return (
        <SafeAreaView style={styles.root}>
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { fontSize: fs(28), textAlign: isRTL ? 'right' : 'left' }]}>{t.histTitle}</Text>
                    <Text style={[styles.headerSub, { fontSize: fs(13), textAlign: isRTL ? 'right' : 'left' }]}>{t.yourPastDoses}</Text>
                </View>
                {loading && <ActivityIndicator color="#1e3a8a" />}
            </View>

            {records.length > 0 && (
                <View style={styles.summaryRow}>
                    {(['TAKEN', 'TAKEN_LATE', 'TAKEN_EARLY', 'SKIPPED', 'MISSED'] as const).map((s, i, arr) => (
                        <View key={s} style={[styles.summaryCell, i < arr.length - 1 && styles.summaryCellBorder]}>
                            <Text style={[styles.summaryNum, { fontSize: fs(16), color: statusColor(s) }]}>
                                {counts[s] ?? 0}
                            </Text>
                            <Text style={[styles.summaryLabel, { fontSize: fs(8) }]}>
                                {filterLabels[s]}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
            >
                {FILTER_OPTIONS.map(opt => {
                    const active = activeFilter === opt;
                    const color = opt === 'ALL' ? '#1e3a8a' : statusColor(opt);
                    const bg = opt === 'ALL' ? '#eff6ff' : statusBg(opt);
                    return (
                        <TouchableOpacity
                            key={opt}
                            onPress={() => setActiveFilter(opt)}
                            activeOpacity={0.7}
                            style={[
                                styles.filterChip,
                                active && { backgroundColor: bg, borderColor: color },
                            ]}
                        >
                            <Text style={[
                                styles.filterChipText,
                                { fontSize: fs(12), color: active ? color : '#94a3b8' },
                            ]}>
                                {filterLabels[opt]}
                                {opt !== 'ALL' && counts[opt] ? ` (${counts[opt]})` : ''}
                                {opt === 'ALL' ? ` (${records.length})` : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {error ? (
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={44} color="#cbd5e1" />
                    <Text style={[styles.emptyText, { fontSize: fs(14) }]}>{error}</Text>
                    <TouchableOpacity onPress={fetchHistory} style={styles.retryBtn} activeOpacity={0.7}>
                        <Text style={[styles.retryBtnText, { fontSize: fs(13) }]}>{t.retry}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchHistory} tintColor="#1e3a8a" />
                    }
                >
                    {loading && records.length === 0 ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="#1e3a8a" />
                            <Text style={[styles.emptyText, { fontSize: fs(14) }]}>{t.histLoading}</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={styles.centered}>
                            <Ionicons name="time-outline" size={48} color="#cbd5e1" />
                            <Text style={[styles.emptyTitle, { fontSize: fs(17) }]}>
                                {records.length === 0 ? t.histNoHistory : t.histNoMatch}
                            </Text>
                            <Text style={[styles.emptyText, { fontSize: fs(13) }]}>
                                {records.length === 0 ? t.histNoHistoryDesc : t.histNoMatchDesc}
                            </Text>
                        </View>
                    ) : (
                        sortedDateKeys.map(dateKey => (
                            <View key={dateKey} style={styles.dateGroup}>
                                <View style={[styles.dateHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                    <Text style={[styles.dateHeaderText, { fontSize: fs(12) }]}>
                                        {formatGroupDate(dateKey, t)}
                                    </Text>
                                    <View style={styles.dateHeaderLine} />
                                    <View style={styles.dateBadge}>
                                        <Text style={[styles.dateBadgeText, { fontSize: fs(10) }]}>
                                            {grouped[dateKey].length}
                                        </Text>
                                    </View>
                                </View>

                                {grouped[dateKey].map(record => {
                                    const statusName = record.doseStatus?.name ?? 'NONE';
                                    const color = statusColor(statusName);
                                    const bg = statusBg(statusName);
                                    const dose = record.dose;
                                    const medName = dose?.medicine?.name ?? dose?.name ?? '—';
                                    const doseName = dose?.name ?? '';
                                    const mg = dose?.doseInMilligram ?? 0;
                                    const timeLabel = record.date
                                        ? new Date(record.date).toLocaleTimeString('en-US', {
                                            hour: 'numeric', minute: '2-digit', hour12: true,
                                        })
                                        : '—';

                                    return (
                                        <View key={record.id} style={[styles.recordCard, { borderLeftColor: isRTL ? undefined : color, borderRightColor: isRTL ? color : undefined, borderLeftWidth: isRTL ? 1 : 4, borderRightWidth: isRTL ? 4 : 1, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                            <View style={[styles.recordIconWrap, { backgroundColor: bg }]}>
                                                <Ionicons name="medical" size={16} color={color} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                                                <Text style={[styles.recordMedName, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                                                    {medName}
                                                </Text>
                                                {!!doseName && doseName !== medName && (
                                                    <Text style={[styles.recordDoseName, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                                                        {doseName}
                                                    </Text>
                                                )}
                                                <View style={[styles.recordMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                                    <View style={styles.timeBadge}>
                                                        <Text style={[styles.timeBadgeText, { fontSize: fs(10) }]}>{timeLabel}</Text>
                                                    </View>
                                                    {mg > 0 && (
                                                        <Text style={[styles.mgText, { fontSize: fs(10) }]}>{mg}mg</Text>
                                                    )}
                                                </View>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: bg, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
                                                <Text style={[styles.statusBadgeText, { fontSize: fs(9), color }]}>
                                                    {statusLabel(statusName)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center',
    },
    headerTitle: { fontWeight: 'bold', color: '#172554' },
    headerSub: { color: '#94a3b8', marginTop: 2 },
    summaryRow: {
        marginHorizontal: 24, marginBottom: 12, flexDirection: 'row',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9',
        borderRadius: 16, overflow: 'hidden',
    },
    summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    summaryCellBorder: { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
    summaryNum: { fontWeight: '900' },
    summaryLabel: { color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    filterScroll: { maxHeight: 44, marginBottom: 12 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
        borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    },
    filterChipText: { fontWeight: '700' },
    scroll: { flex: 1, paddingHorizontal: 24 },
    centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyTitle: { fontWeight: 'bold', color: '#94a3b8', marginTop: 16, textAlign: 'center' },
    emptyText: { color: '#cbd5e1', marginTop: 8, textAlign: 'center', lineHeight: 20 },
    retryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16, marginTop: 16 },
    retryBtnText: { color: '#fff', fontWeight: 'bold' },
    dateGroup: { marginBottom: 24 },
    dateHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dateHeaderText: { fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
    dateHeaderLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0', marginLeft: 8 },
    dateBadge: {
        backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 999, marginLeft: 8,
    },
    dateBadgeText: { color: '#64748b', fontWeight: '700' },
    recordCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderLeftWidth: 4, borderRadius: 16, padding: 14, marginBottom: 8,
    },
    recordIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    recordMedName: { fontWeight: 'bold', color: '#172554' },
    recordDoseName: { color: '#94a3b8', marginTop: 2 },
    recordMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    timeBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    timeBadgeText: { color: '#64748b', fontWeight: '700' },
    mgText: { color: '#94a3b8', fontWeight: '500' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    statusBadgeText: { fontWeight: '700', textTransform: 'capitalize' },
});