import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import {
    StatusBar, Text, View, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { RootState, AppDispatch } from '../../store/store';
import { fetchActiveDoses } from '../../store/doseSlice';
import { hydrateLogs, takeDoseAndLog, skipDoseAndLog } from '../../store/doseLogSlice';
import { getDosesForDate, toDateString, DisplayDose, isPastDeadline, getCurrentHHMM } from '../utils/doseHelpers';
import { fetchUnreadMessages, markMessageRead } from '../../store/messageSlice';
import { useFontScale } from '../../context/FontContext';
import { useTranslation } from '../../context/useTranslation';
import { useScheduleDoseNotifications } from '../useScheduleNotifications';

const EARLY_GRACE_MINUTES = 15;

function minutesBetweenHHMM(from: string, to: string): number {
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    return (th * 60 + tm) - (fh * 60 + fm);
}

function MessageBanner() {
    const dispatch = useDispatch<AppDispatch>();
    const { messages } = useSelector((s: RootState) => s.messages);
    const { fs } = useFontScale();
    const { t } = useTranslation();
    const opacity = useRef(new Animated.Value(0)).current;
    const current = messages[0] ?? null;

    useEffect(() => {
        if (current) {
            Animated.timing(opacity, {
                toValue: 1, duration: 300, useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(opacity, {
                toValue: 0, duration: 200, useNativeDriver: true,
            }).start();
        }
    }, [current?.id]);

    if (!current) return null;

    const handleDismiss = () => {
        dispatch(markMessageRead(current.id));
        dispatch(fetchUnreadMessages());
    };

    return (
        <Animated.View style={[styles.messageBanner, { opacity }]}>
            <View style={styles.messageBannerLeft}>
                <View style={styles.messageBannerIcon}>
                    <Ionicons name="notifications" size={18} color="#ea580c" />
                </View>
                <Text style={[styles.messageBannerText, { fontSize: fs(13) }]} numberOfLines={4}>
                    {current.message}
                </Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.messageBannerBtn} activeOpacity={0.7}>
                <Text style={[styles.messageBannerBtnText, { fontSize: fs(12) }]}>{t.iUnderstand}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

function FullScreenLoader({ fs }: { fs: (n: number) => number }) {
    const { t } = useTranslation();
    return (
        <View style={styles.fullScreenLoader}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={[styles.fullScreenLoaderText, { fontSize: fs(14) }]}>
                {t.loadingDoses}
            </Text>
        </View>
    );
}

export default function Index() {
    const dispatch = useDispatch<AppDispatch>();
    const { doses = [], loading = false, error = null } = useSelector((s: RootState) => s.doses || {});
    const { logs, hydrated } = useSelector((s: RootState) => s.doseLogs);
    const { name } = useSelector((s: RootState) => s.auth || {});
    const { fs } = useFontScale();
    const { t, isRTL } = useTranslation();

    const [initialLoadDone, setInitialLoadDone] = useState(false);

    const inFlight = useRef<Record<string, boolean>>({});
    const [takingKeys, setTakingKeys] = useState<Record<string, boolean>>({});

    useFocusEffect(
        useCallback(() => {
            setInitialLoadDone(false);

            dispatch(hydrateLogs())
                .then(() => dispatch(fetchActiveDoses()))
                .then(() => setInitialLoadDone(true));

            dispatch(fetchUnreadMessages());
        }, [dispatch])
    );

    const todayStr = useMemo(() => toDateString(new Date()), []);
    const stableNow = useRef(new Date());
    useEffect(() => { stableNow.current = new Date(); }, [todayStr]);
    const currentTime = useMemo(() => getCurrentHHMM(), [todayStr]);

    const todayDoses = useMemo(() => {
        if (!Array.isArray(doses) || doses.length === 0) return [];
        return getDosesForDate(doses, stableNow.current);
    }, [doses, todayStr]);

    useScheduleDoseNotifications(todayDoses, logs);

    const pendingDoses = useMemo(() =>
        todayDoses.filter(d => {
            if (!d?.doseKey) return false;
            const log = logs.find(l => l.doseKey === d.doseKey);
            return !log && d.time <= currentTime && !isPastDeadline(d);
        }), [todayDoses, logs, currentTime]);

    const missedDoses = useMemo(() =>
        todayDoses.filter(d => {
            if (!d?.doseKey) return false;
            const log = logs.find(l => l.doseKey === d.doseKey);
            return !log && isPastDeadline(d);
        }), [todayDoses, logs]);

    const upcomingDoses = useMemo(() =>
        todayDoses.filter(d => {
            if (!d?.doseKey) return false;
            const log = logs.find(l => l.doseKey === d.doseKey);
            return !log && d.time > currentTime && !isPastDeadline(d);
        }), [todayDoses, logs, currentTime]);

    const takenDoses = useMemo(() =>
        todayDoses.filter(d => {
            const log = logs.find(l => l.doseKey === d.doseKey);
            return log?.status === 'taken';
        }), [todayDoses, logs]);

    const skippedDoses = useMemo(() =>
        todayDoses.filter(d => {
            const log = logs.find(l => l.doseKey === d.doseKey);
            return log?.status === 'skipped';
        }), [todayDoses, logs]);

    const nextDoseTime = upcomingDoses.length > 0 ? upcomingDoses[0]?.displayTime : null;

    const handleTake = useCallback(async (dose: DisplayDose) => {
        if (!dose?.doseKey || inFlight.current[dose.doseKey]) return;
        inFlight.current[dose.doseKey] = true;
        setTakingKeys(prev => ({ ...prev, [dose.doseKey]: true }));
        try {
            await dispatch(takeDoseAndLog({
                doseKey: dose.doseKey,
                backendDoseId: dose.backendId,
                date: dose.date,
                status: 'taken',
            }));
            dispatch(fetchUnreadMessages());
            Toast.show({
                type: 'success',
                text1: t.toastDoseTaken ?? 'Dose taken',
                text2: `${dose.medicineName} (${dose.displayTime}) ${t.toastDoseTakenSub ?? 'marked as taken.'}`,
                position: 'bottom',
                visibilityTime: 3000,
            });
        } finally {
            inFlight.current[dose.doseKey] = false;
            setTakingKeys(prev => { const n = { ...prev }; delete n[dose.doseKey]; return n; });
        }
    }, [dispatch, t]);


    const handleSkip = useCallback(async (dose: DisplayDose) => {
        if (!dose?.doseKey) return;
        await dispatch(skipDoseAndLog({
            doseKey: dose.doseKey,
            backendDoseId: dose.backendId,
            date: dose.date,
            status: 'skipped',
        }));
        Toast.show({
            type: 'info',
            text1: t.toastDoseSkipped ?? 'Dose skipped',
            text2: `${dose.medicineName} (${dose.displayTime}) ${t.toastDoseSkippedSub ?? 'marked as skipped.'}`,
            position: 'bottom',
            visibilityTime: 3000,
        });
    }, [dispatch, t]);

    const confirmTake = useCallback((dose: DisplayDose) => {
        Alert.alert(
            t.takeDose,
            `${t.takeDoseConfirm} ${dose.medicineName} (${dose.displayTime})?\n\n${t.cannotBeUndone}`,
            [
                { text: t.cancel, style: 'cancel' },
                { text: t.take, onPress: () => handleTake(dose) },
            ]
        );
    }, [handleTake, t]);

    const confirmTakeEarly = useCallback((dose: DisplayDose) => {
        Alert.alert(
            t.takeEarlyTitle,
            `${t.takeEarlyConfirm} ${dose.medicineName} (${dose.displayTime})?\n\n${t.cannotBeUndone}`,
            [
                { text: t.cancel, style: 'cancel' },
                { text: t.take, onPress: () => handleTake(dose) },
            ]
        );
    }, [handleTake, t]);

    const confirmSkip = useCallback((dose: DisplayDose) => {
        Alert.alert(
            t.skipDose,
            `${t.skipDoseConfirm} ${dose.medicineName} ${t.atTime} ${dose.displayTime}?\n\n${t.cannotBeUndone}`,
            [
                { text: t.cancel, style: 'cancel' },
                { text: t.skip, style: 'destructive', onPress: () => handleSkip(dose) },
            ]
        );
    }, [handleSkip, t]);

    const isUpcomingWithinGrace = useCallback((dose: DisplayDose): boolean => {
        const minsUntil = minutesBetweenHHMM(currentTime, dose.time);
        return minsUntil <= EARLY_GRACE_MINUTES;
    }, [currentTime]);

    const isReady = hydrated && initialLoadDone;

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View>
                    <Text style={[styles.headerTitle, { fontSize: fs(28) }]}>{t.homeTitle}</Text>
                    {!!name && <Text style={[styles.headerSub, { fontSize: fs(13) }]}>{t.homeGreeting.replace('{name}', name)}</Text>}
                </View>
                {(!isReady || loading) && <ActivityIndicator color="#1e3a8a" />}
            </View>

            {!isReady ? (
                <FullScreenLoader fs={fs} />
            ) : (
                <>
                    <View style={{ paddingHorizontal: 24, marginBottom: 4 }}>
                        <MessageBanner />
                    </View>

                    {todayDoses.length > 0 && (
                        <View style={styles.summaryBar}>
                            <View style={styles.summaryCell}>
                                <Text style={[styles.summaryNum, { fontSize: fs(20), color: '#1e3a8a' }]}>{todayDoses.length}</Text>
                                <Text style={[styles.summaryLabel, { fontSize: fs(10) }]}>{t.summaryTotal}</Text>
                            </View>
                            <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                                <Text style={[styles.summaryNum, { fontSize: fs(20), color: '#16a34a' }]}>{takenDoses.length}</Text>
                                <Text style={[styles.summaryLabel, { fontSize: fs(10) }]}>{t.summaryTaken}</Text>
                            </View>
                            <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                                <Text style={[styles.summaryNum, { fontSize: fs(20), color: '#f97316' }]}>{pendingDoses.length}</Text>
                                <Text style={[styles.summaryLabel, { fontSize: fs(10) }]}>{t.summaryPending}</Text>
                            </View>
                            <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                                <Text style={[styles.summaryNum, { fontSize: fs(20), color: '#94a3b8' }]}>{skippedDoses.length}</Text>
                                <Text style={[styles.summaryLabel, { fontSize: fs(10) }]}>{t.summarySkipped}</Text>
                            </View>
                            {missedDoses.length > 0 && (
                                <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                                    <Text style={[styles.summaryNum, { fontSize: fs(20), color: '#ef4444' }]}>{missedDoses.length}</Text>
                                    <Text style={[styles.summaryLabel, { fontSize: fs(10) }]}>{t.summaryMissed}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {!!error && (
                        <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                            <Text style={[styles.errorText, { fontSize: fs(13) }]}>{error}</Text>
                            <TouchableOpacity onPress={() => dispatch(fetchActiveDoses())}>
                                <Text style={[styles.retryText, { fontSize: fs(13) }]}>{t.retry}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={loading}
                                onRefresh={() => {
                                    setInitialLoadDone(false);
                                    dispatch(hydrateLogs())
                                        .then(() => dispatch(fetchActiveDoses()))
                                        .then(() => setInitialLoadDone(true));
                                    dispatch(fetchUnreadMessages());
                                }}
                                tintColor="#1e3a8a"
                            />
                        }
                    >
                        <Text style={[styles.sectionTitle, { fontSize: fs(20), textAlign: isRTL ? 'right' : 'left' }]}>{t.sectionTimeTotake}</Text>

                        {pendingDoses.length === 0 ? (
                            <View style={styles.allCaughtCard}>
                                <View style={styles.checkCircle}>
                                    <Ionicons name="checkmark" size={30} color="#16a34a" />
                                </View>
                                <Text style={[styles.allCaughtTitle, { fontSize: fs(22) }]}>{t.allCaughtUp}</Text>
                                {nextDoseTime ? (
                                    <Text style={[styles.allCaughtSub, { fontSize: fs(14) }]}>{t.nextDoseAt} {nextDoseTime}</Text>
                                ) : doses.length === 0 ? (
                                    <Text style={[styles.allCaughtSub, { fontSize: fs(13) }]}>{t.noMedsYet}</Text>
                                ) : (
                                    <Text style={[styles.allCaughtSub, { fontSize: fs(13) }]}>{t.noMoreDosesToday}</Text>
                                )}
                            </View>
                        ) : (
                            <View style={{ marginBottom: 8 }}>
                                {pendingDoses.map((dose) => {
                                    const isTaking = !!takingKeys[dose.doseKey];
                                    return (
                                        <View key={dose.doseKey} style={styles.pendingCard}>
                                            <View style={[styles.pendingCardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                                <View style={styles.pendingIconWrap}>
                                                    <Ionicons name="medical" size={24} color="#ea580c" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.pendingMedName, { fontSize: fs(17), textAlign: isRTL ? 'right' : 'left' }]}>{dose.medicineName}</Text>
                                                    <Text style={[styles.pendingDoseName, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>{dose.doseName}</Text>
                                                    <View style={[styles.pendingMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                                        <View style={styles.timeBadge}>
                                                            <Text style={[styles.timeBadgeText, { fontSize: fs(10) }]}>{dose.displayTime}</Text>
                                                        </View>
                                                        <Text style={[styles.mgText, { fontSize: fs(11) }]}>{dose.doseInMilligram} mg</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                                <TouchableOpacity
                                                    onPress={() => confirmTake(dose)}
                                                    activeOpacity={0.7}
                                                    disabled={isTaking}
                                                    style={[styles.takeBtn, { opacity: isTaking ? 0.7 : 1 }]}
                                                >
                                                    {isTaking
                                                        ? <ActivityIndicator size="small" color="#fff" />
                                                        : <Text style={{ fontSize: fs(14), color: '#fff', fontWeight: 'bold' }}>{t.take}</Text>
                                                    }
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => confirmSkip(dose)}
                                                    activeOpacity={0.7}
                                                    disabled={isTaking}
                                                    style={[styles.skipBtn, { opacity: isTaking ? 0.5 : 1 }]}
                                                >
                                                    <Text style={{ fontSize: fs(14), color: '#64748b', fontWeight: 'bold' }}>{t.skip}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {missedDoses.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: fs(20), marginTop: 24, color: '#ef4444', textAlign: isRTL ? 'right' : 'left' }]}>
                                    {t.sectionMissedToday}
                                </Text>
                                {missedDoses.map((dose) => (
                                    <View key={dose.doseKey} style={[styles.missedCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                        <View style={styles.missedIconWrap}>
                                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.missedMedName, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]}>{dose.medicineName}</Text>
                                            <Text style={[styles.missedMeta, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                                {dose.displayTime} · {dose.doseInMilligram} mg · {t.missed}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}

                        {upcomingDoses.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: fs(20), marginTop: 32, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }]}>
                                    {t.sectionUpcomingToday}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                                    {upcomingDoses.map((dose) => {
                                        const withinGrace = isUpcomingWithinGrace(dose);
                                        return (
                                            <View key={dose.doseKey} style={styles.upcomingCard}>
                                                <View style={{ padding: 24 }}>
                                                    <View style={styles.upcomingTimeBadge}>
                                                        <Text style={[styles.upcomingTimeBadgeText, { fontSize: fs(10) }]}>{dose.displayTime}</Text>
                                                    </View>
                                                    <Text style={[styles.upcomingMedName, { fontSize: fs(18) }]} numberOfLines={2}>{dose.medicineName}</Text>
                                                    <Text style={[styles.upcomingDoseName, { fontSize: fs(11) }]} numberOfLines={1}>{dose.doseName}</Text>
                                                    <View style={styles.upcomingMgRow}>
                                                        <Text style={[styles.upcomingMgLabel, { fontSize: fs(10) }]}>{t.dose}</Text>
                                                        <View style={styles.upcomingMgBadge}>
                                                            <Text style={[styles.upcomingMgText, { fontSize: fs(11) }]}>{dose.doseInMilligram} mg</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <View style={[styles.upcomingActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                                    <TouchableOpacity
                                                        onPress={() => withinGrace ? confirmTake(dose) : confirmTakeEarly(dose)}
                                                        activeOpacity={0.7}
                                                        style={styles.upcomingActionBtn}
                                                    >
                                                        <Text style={{ fontSize: fs(11), color: '#2563eb', fontWeight: 'bold' }}>
                                                            {withinGrace ? t.take : t.takeEarly}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <View style={styles.upcomingActionDivider} />
                                                    <TouchableOpacity onPress={() => confirmSkip(dose)} activeOpacity={0.7} style={styles.upcomingActionBtn}>
                                                        <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold' }}>{t.skip}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </>
                        )}

                        {takenDoses.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: fs(20), marginTop: 32, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>{t.sectionTakenToday}</Text>
                                {takenDoses.map((dose) => (
                                    <View key={dose.doseKey} style={[styles.takenCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                        <View style={styles.takenIconWrap}>
                                            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.takenMedName, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]}>{dose.medicineName}</Text>
                                            <Text style={[styles.takenMeta, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                                {dose.displayTime} · {dose.doseInMilligram} mg
                                            </Text>
                                        </View>
                                        <View style={styles.lockedBadge}>
                                            <Ionicons name="lock-closed" size={12} color="#16a34a" />
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}

                        {skippedDoses.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { fontSize: fs(20), marginTop: 32, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>{t.sectionSkippedToday}</Text>
                                {skippedDoses.map((dose) => (
                                    <View key={dose.doseKey} style={[styles.skippedCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                        <View style={styles.skippedIconWrap}>
                                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.skippedMedName, { fontSize: fs(15), textAlign: isRTL ? 'right' : 'left' }]}>{dose.medicineName}</Text>
                                            <Text style={[styles.skippedMeta, { fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }]}>
                                                {dose.displayTime} · {dose.doseInMilligram} mg
                                            </Text>
                                        </View>
                                        <View style={styles.lockedBadge}>
                                            <Ionicons name="lock-closed" size={12} color="#94a3b8" />
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </>
            )}

            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
        justifyContent: 'space-between', alignItems: 'center',
    },
    headerTitle: { fontWeight: 'bold', color: '#172554', letterSpacing: -0.5 },
    headerSub: { color: '#94a3b8' },
    fullScreenLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    fullScreenLoaderText: { color: '#94a3b8', fontWeight: '500' },
    messageBanner: {
        backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
        borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 4,
    },
    messageBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
    messageBannerIcon: { backgroundColor: '#ffedd5', padding: 6, borderRadius: 10, marginRight: 10 },
    messageBannerText: { color: '#9a3412', fontWeight: '500', flex: 1, lineHeight: 18 },
    messageBannerBtn: {
        backgroundColor: '#ea580c', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 10, marginLeft: 10,
    },
    messageBannerBtnText: { color: '#fff', fontWeight: 'bold' },
    summaryBar: {
        marginHorizontal: 24, marginBottom: 8, flexDirection: 'row',
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9',
        borderRadius: 16, overflow: 'hidden',
    },
    summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    summaryCellBorder: { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
    summaryNum: { fontWeight: '900' },
    summaryLabel: { color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    errorBanner: {
        marginHorizontal: 24, marginTop: 8, backgroundColor: '#fef2f2',
        borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, padding: 12,
        alignItems: 'center',
    },
    errorText: { color: '#dc2626', fontWeight: '500', marginLeft: 8, flex: 1 },
    retryText: { color: '#ef4444', fontWeight: 'bold' },
    scroll: { flex: 1, paddingHorizontal: 20 },
    scrollContent: { paddingBottom: 100 },
    sectionTitle: { color: '#0f172a', fontWeight: 'bold', marginLeft: 4, marginBottom: 12, marginTop: 12 },
    allCaughtCard: {
        minHeight: 180, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 35, alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    checkCircle: {
        backgroundColor: '#dcfce7', width: 56, height: 56, borderRadius: 28,
        marginBottom: 12, alignItems: 'center', justifyContent: 'center',
    },
    allCaughtTitle: { fontWeight: 'bold', color: '#172554' },
    allCaughtSub: { color: '#94a3b8', marginTop: 8, fontWeight: '500' },
    pendingCard: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 28, padding: 20, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    pendingCardRow: { alignItems: 'center' },
    pendingIconWrap: { backgroundColor: '#fff7ed', padding: 12, borderRadius: 16, marginRight: 16 },
    pendingMedName: { fontWeight: 'bold', color: '#172554' },
    pendingDoseName: { color: '#94a3b8', fontWeight: '500' },
    pendingMetaRow: { alignItems: 'center', marginTop: 4 },
    timeBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
    timeBadgeText: { color: '#c2410c', fontWeight: 'bold', textTransform: 'uppercase' },
    mgText: { color: '#94a3b8', fontWeight: '500' },
    buttonRow: { marginTop: 16, gap: 12 },
    takeBtn: {
        flex: 1, backgroundColor: '#2563eb', borderRadius: 18,
        paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
    },
    skipBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
    upcomingCard: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 30, width: 208, marginRight: 16,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    upcomingTimeBadge: {
        backgroundColor: '#eff6ff', alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 12,
    },
    upcomingTimeBadgeText: { color: '#1e3a8a', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    upcomingMedName: { color: '#172554', fontWeight: 'bold', lineHeight: 24 },
    upcomingDoseName: { color: '#94a3b8', marginTop: 4 },
    upcomingMgRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: 16,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9',
    },
    upcomingMgLabel: { color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    upcomingMgBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
    upcomingMgText: { color: '#1e3a8a', fontWeight: '900' },
    upcomingActions: {
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
        marginHorizontal: 16, marginBottom: 16, paddingTop: 8,
    },
    upcomingActionBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
    upcomingActionDivider: { width: 1, backgroundColor: '#f1f5f9' },
    lockedBadge: { backgroundColor: '#f1f5f9', padding: 6, borderRadius: 8, marginLeft: 8 },
    takenCard: {
        backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
        borderRadius: 24, padding: 16, marginBottom: 8, alignItems: 'center',
    },
    takenIconWrap: { backgroundColor: '#dcfce7', padding: 10, borderRadius: 12, marginRight: 12 },
    takenMedName: { fontWeight: 'bold', color: '#166534' },
    takenMeta: { color: '#16a34a' },
    skippedCard: {
        backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 24, padding: 16, marginBottom: 8, alignItems: 'center',
    },
    skippedIconWrap: { backgroundColor: '#e2e8f0', padding: 10, borderRadius: 12, marginRight: 12 },
    skippedMedName: { fontWeight: 'bold', color: '#64748b', textDecorationLine: 'line-through' },
    skippedMeta: { color: '#94a3b8' },
    missedCard: {
        backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
        borderRadius: 24, padding: 16, marginBottom: 8, alignItems: 'center',
    },
    missedIconWrap: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 12, marginRight: 12 },
    missedMedName: { fontWeight: 'bold', color: '#991b1b' },
    missedMeta: { color: '#ef4444' },
});