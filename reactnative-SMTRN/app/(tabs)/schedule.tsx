import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchActiveDoses } from '../../store/doseSlice';
import { hydrateLogs, takeDoseAndLog, skipDoseAndLog } from '../../store/doseLogSlice';
import { getDosesForDate, toDateString, DisplayDose, isPastDeadline, getCurrentHHMM } from '../utils/doseHelpers';
import { fetchUnreadMessages } from '../../store/messageSlice';
import { useFontScale } from '../../context/FontContext';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from '../../context/useTranslation';

const DAY_CARD_WIDTH = 76;
const DAY_CARD_MARGIN = 10;
const DAY_CARD_STRIDE = DAY_CARD_WIDTH + DAY_CARD_MARGIN;
const DAYS_BEFORE_TODAY = 7;
const SCROLL_PADDING = 24;

const DayButton = ({ day, isSelected, onSelect, fs, isRTL }: any) => (
    <TouchableOpacity
        onPress={() => onSelect(day.fullDate)}
        activeOpacity={0.8}
        style={[dayStyles.card, isSelected && dayStyles.cardSelected]}
    >
        <Text style={[dayStyles.dayName, isSelected && dayStyles.textSelected, { fontSize: fs(11) }]}>{day.dayName.substring(0, 3)}</Text>
        <Text style={[dayStyles.dayNumber, isSelected && dayStyles.textSelected, { fontSize: fs(22) }]}>{day.dayNumber}</Text>
        <Text style={[dayStyles.monthName, isSelected && dayStyles.textSelected, { fontSize: fs(11) }]}>{day.monthName.substring(0, 3)}</Text>
    </TouchableOpacity>
);

const Schedule = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const dispatch = useDispatch<AppDispatch>();
    const { doses, loading, error } = useSelector((s: RootState) => s.doses);
    const logs = useSelector((s: RootState) => s.doseLogs.logs);
    const { fs } = useFontScale();
    const { t, isRTL, language } = useTranslation();
    const dayScrollRef = useRef<ScrollView>(null);

    const isToday = useMemo(() =>
        toDateString(selectedDate) === toDateString(new Date()), [selectedDate]);

    const isPastDay = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sel = new Date(selectedDate);
        sel.setHours(0, 0, 0, 0);
        return sel < today;
    }, [selectedDate]);

    const currentTime = useMemo(() => getCurrentHHMM(), []);

    useFocusEffect(
        useCallback(() => {
            dispatch(hydrateLogs());
            dispatch(fetchActiveDoses());
        }, [dispatch])
    );

    const scrollToDate = useCallback((date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const index = DAYS_BEFORE_TODAY + diffDays;
        const x = index * DAY_CARD_STRIDE - SCROLL_PADDING;
        dayScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            dayScrollRef.current?.scrollTo({
                x: DAYS_BEFORE_TODAY * DAY_CARD_STRIDE,
                animated: false,
            });
        }, 150);
        return () => clearTimeout(timer);
    }, []);

    const handleSelectDate = useCallback((date: Date) => {
        setSelectedDate(new Date(date));
        scrollToDate(date);
    }, [scrollToDate]);

    const handleTodayPress = useCallback(() => {
        const today = new Date();
        setSelectedDate(today);
        scrollToDate(today);
    }, [scrollToDate]);

    const days = useMemo(() =>
        Array.from({ length: 30 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i - DAYS_BEFORE_TODAY);
            const locale = language === 'ar' ? 'ar-SA' : 'en-US';
            return {
                fullDate: new Date(d),
                dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
                dayNumber: d.getDate(),
                monthName: d.toLocaleDateString('en-US', { month: 'long' }),
            };
        }), [language]
    );

    const dosesForDate = useMemo(
        () => getDosesForDate(doses, selectedDate),
        [doses, selectedDate]
    );

    const groupedDoses = useMemo(() => {
        return dosesForDate.reduce((acc: Record<string, DisplayDose[]>, dose) => {
            if (!acc[dose.displayTime]) acc[dose.displayTime] = [];
            acc[dose.displayTime].push(dose);
            return acc;
        }, {});
    }, [dosesForDate]);

    const getLogStatus = useCallback((doseKey: string) =>
            logs.find(l => l.doseKey === doseKey)?.status ?? null,
        [logs]
    );

    const isMissedForDate = useCallback((dose: DisplayDose): boolean => {
        const status = getLogStatus(dose.doseKey);
        if (status) return false;
        if (isToday) return isPastDeadline(dose);
        return isPastDay;
    }, [isToday, isPastDay, getLogStatus]);

    const canAct = useCallback((dose: DisplayDose): boolean => {
        if (!isToday) return false;
        if (isPastDeadline(dose)) return false;
        const status = getLogStatus(dose.doseKey);
        return !status;
    }, [isToday, getLogStatus]);

    const handleTake = useCallback((dose: DisplayDose) => {
        if (!canAct(dose)) return;
        Alert.alert(
            t.takeDose,
            `${t.takeDoseConfirm} ${dose.medicineName} (${dose.displayTime})?\n\n${t.cannotBeUndone}`,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.take,
                    onPress: () => {
                        dispatch(takeDoseAndLog({
                            doseKey: dose.doseKey,
                            backendDoseId: dose.backendId,
                            date: dose.date,
                            status: 'taken',
                        }));
                        dispatch(fetchUnreadMessages());
                    },
                },
            ]
        );
    }, [dispatch, canAct, t]);

    const handleSkip = useCallback((dose: DisplayDose) => {
        if (!canAct(dose)) return;
        Alert.alert(
            t.skipDose,
            `${t.skipDoseConfirm} ${dose.medicineName} ${t.atTime} ${dose.displayTime}?\n\n${t.cannotBeUndone}`,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.skip,
                    style: 'destructive',
                    onPress: () => {
                        dispatch(skipDoseAndLog({
                            doseKey: dose.doseKey,
                            backendDoseId: dose.backendId,
                            date: dose.date,
                            status: 'skipped',
                        }));
                    },
                },
            ]
        );
    }, [dispatch, canAct, t]);

    const takenCount = dosesForDate.filter(d => getLogStatus(d.doseKey) === 'taken').length;
    const skippedCount = dosesForDate.filter(d => getLogStatus(d.doseKey) === 'skipped').length;
    const missedCount = dosesForDate.filter(d => isMissedForDate(d)).length;
    const pendingCount = dosesForDate.length - takenCount - skippedCount - missedCount;

    const formattedDate = selectedDate.toLocaleDateString(
        language === 'ar' ? 'ar-SA' : 'en-US',
        { weekday: 'long', month: 'long', day: 'numeric' }
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className={`px-6 pt-4 pb-2 flex-row justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <View>
                    <Text style={{ fontSize: fs(28) }} className="font-bold text-blue-950 tracking-tight">{t.scheduleTitle}</Text>
                    <Text style={{ fontSize: fs(13) }} className="text-slate-500 font-medium">
                        {formattedDate}
                    </Text>
                </View>
                <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`} style={{ gap: 8 }}>
                    {loading && <ActivityIndicator size="small" color="#1e3a8a" />}
                    <TouchableOpacity
                        onPress={handleTodayPress}
                        className="bg-blue-100 px-4 py-2 rounded-full"
                    >
                        <Text style={{ fontSize: fs(11) }} className="text-blue-900 font-bold">{t.today}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {dosesForDate.length > 0 && (
                <View className={`mx-6 mt-2 mb-1 flex-row bg-white border border-slate-100 rounded-2xl overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <View className="flex-1 items-center py-2.5 border-r border-slate-100">
                        <Text style={{ fontSize: fs(18) }} className="font-black text-orange-500">{pendingCount}</Text>
                        <Text style={{ fontSize: fs(9) }} className="text-slate-400 font-semibold uppercase tracking-wide">{t.summaryPending}</Text>
                    </View>
                    <View className="flex-1 items-center py-2.5 border-r border-slate-100">
                        <Text style={{ fontSize: fs(18) }} className="font-black text-green-600">{takenCount}</Text>
                        <Text style={{ fontSize: fs(9) }} className="text-slate-400 font-semibold uppercase tracking-wide">{t.summaryTaken}</Text>
                    </View>
                    <View className="flex-1 items-center py-2.5 border-r border-slate-100">
                        <Text style={{ fontSize: fs(18) }} className="font-black text-slate-400">{skippedCount}</Text>
                        <Text style={{ fontSize: fs(9) }} className="text-slate-400 font-semibold uppercase tracking-wide">{t.summarySkipped}</Text>
                    </View>
                    {missedCount > 0 && (
                        <View className="flex-1 items-center py-2.5">
                            <Text style={{ fontSize: fs(18) }} className="font-black text-red-500">{missedCount}</Text>
                            <Text style={{ fontSize: fs(9) }} className="text-slate-400 font-semibold uppercase tracking-wide">{t.summaryMissed}</Text>
                        </View>
                    )}
                </View>
            )}

            {error && (
                <View className={`mx-6 mt-2 bg-red-50 border border-red-200 rounded-xl p-3 flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                    <Text style={{ fontSize: fs(11) }} className="text-red-600 font-medium ml-2 flex-1">{error}</Text>
                    <TouchableOpacity onPress={() => dispatch(fetchActiveDoses())}>
                        <Text style={{ fontSize: fs(11) }} className="text-red-500 font-bold">{t.retry}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View className="py-4">
                <ScrollView
                    ref={dayScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: SCROLL_PADDING }}
                >
                    {days.map(day => (
                        <DayButton
                            key={day.fullDate.toDateString()}
                            day={day}
                            isSelected={selectedDate.toDateString() === day.fullDate.toDateString()}
                            onSelect={handleSelectDate}
                            fs={fs}
                            isRTL={isRTL}
                        />
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={() => {
                            dispatch(hydrateLogs());
                            dispatch(fetchActiveDoses());
                        }}
                        tintColor="#1e3a8a"
                    />
                }
            >
                {loading && doses.length === 0 ? (
                    <View className="items-center justify-center pt-16">
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text style={{ fontSize: fs(14) }} className="text-slate-400 font-medium mt-3">{t.scheduleLoading}</Text>
                    </View>
                ) : Object.keys(groupedDoses).length > 0 ? (
                    Object.entries(groupedDoses)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([time, dosesAtTime]) => (
                            <View key={time} className="mb-6">
                                <View className={`flex-row items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Text style={{ fontSize: fs(12) }} className="font-bold text-slate-400 uppercase tracking-widest">{time}</Text>
                                    <View className="flex-1 h-[1px] bg-slate-200 ml-4" />
                                </View>

                                {dosesAtTime.map(item => {
                                    const status = getLogStatus(item.doseKey);
                                    const missed = isMissedForDate(item);
                                    const locked = !!status || missed;
                                    const actable = canAct(item);

                                    return (
                                        <View
                                            key={item.doseKey}
                                            className={`border rounded-[28px] p-5 mb-3 shadow-sm ${
                                                status === 'taken'
                                                    ? 'bg-green-50 border-green-200'
                                                    : status === 'skipped'
                                                        ? 'bg-slate-100 border-slate-200'
                                                        : missed
                                                            ? 'bg-red-50 border-red-200'
                                                            : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            <View className={`flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <View className={`flex-row items-center flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <View className={`p-3 rounded-2xl ${isRTL ? 'ml-4' : 'mr-4'} ${
                                                        status === 'taken' ? 'bg-green-100' :
                                                            status === 'skipped' ? 'bg-slate-200' :
                                                                missed ? 'bg-red-100' : 'bg-blue-50'
                                                    }`}>
                                                        <Ionicons
                                                            name="medical"
                                                            size={22}
                                                            color={
                                                                status === 'taken' ? '#16a34a' :
                                                                    status === 'skipped' ? '#94a3b8' :
                                                                        missed ? '#ef4444' : '#1e3a8a'
                                                            }
                                                        />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text
                                                            style={{ fontSize: fs(17), textAlign: isRTL ? 'right' : 'left' }}
                                                            className={`font-bold ${
                                                                status === 'skipped' ? 'text-slate-400 line-through' :
                                                                    status === 'taken' ? 'text-green-800' :
                                                                        missed ? 'text-red-700' : 'text-blue-950'
                                                            }`}
                                                            numberOfLines={1}
                                                        >
                                                            {item.medicineName}
                                                        </Text>
                                                        <Text style={{ fontSize: fs(11), textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 mt-0.5" numberOfLines={1}>{item.doseName}</Text>
                                                        <View className={`flex-row items-center mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            <View className={`px-2 py-0.5 rounded-md ${isRTL ? 'ml-2' : 'mr-2'} ${
                                                                status === 'taken' ? 'bg-green-100' :
                                                                    status === 'skipped' ? 'bg-slate-200' :
                                                                        missed ? 'bg-red-100' : 'bg-blue-100'
                                                            }`}>
                                                                <Text style={{ fontSize: fs(10) }} className={`font-bold uppercase ${
                                                                    status === 'taken' ? 'text-green-700' :
                                                                        status === 'skipped' ? 'text-slate-400' :
                                                                            missed ? 'text-red-600' : 'text-blue-900'
                                                                }`}>
                                                                    {item.doseInMilligram} mg
                                                                </Text>
                                                            </View>
                                                            {status && (
                                                                <Text style={{ fontSize: fs(11) }} className={`font-bold ${status === 'taken' ? 'text-green-600' : 'text-slate-400'}`}>
                                                                    {status === 'taken' ? `✓ ${t.statusTaken}` : `✗ ${t.statusSkipped}`}
                                                                </Text>
                                                            )}
                                                            {missed && !status && (
                                                                <Text style={{ fontSize: fs(11) }} className="font-bold text-red-500">
                                                                    {`✗ ${t.statusMissed}`}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>

                                                {actable ? (
                                                    <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`} style={{ gap: 8 }}>
                                                        <TouchableOpacity
                                                            onPress={() => handleSkip(item)}
                                                            activeOpacity={0.7}
                                                            className="w-9 h-9 rounded-xl items-center justify-center bg-slate-100"
                                                        >
                                                            <Ionicons name="close" size={18} color="#94a3b8" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleTake(item)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Ionicons name="square-outline" size={32} color="#cbd5e1" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : locked ? (
                                                    <View className="bg-slate-100 p-2 rounded-xl">
                                                        <Ionicons
                                                            name="lock-closed"
                                                            size={16}
                                                            color={
                                                                status === 'taken' ? '#16a34a' :
                                                                    status === 'skipped' ? '#94a3b8' :
                                                                        '#ef4444'
                                                            }
                                                        />
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                ) : (
                    <View className="items-center justify-center pt-16">
                        <Ionicons name="calendar-clear-outline" size={48} color="#94a3b8" />
                        <Text style={{ fontSize: fs(17) }} className="text-slate-400 font-bold mt-4">{t.scheduleNoDoses}</Text>
                        <Text style={{ fontSize: fs(13) }} className="text-slate-300 mt-1">
                            {doses.length === 0 ? t.scheduleAddHint : t.scheduleNoneThisDay}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const dayStyles = StyleSheet.create({
    card: {
        width: DAY_CARD_WIDTH, height: 92, backgroundColor: '#fff',
        borderRadius: 22, padding: 10, marginRight: DAY_CARD_MARGIN,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#e2e8f0',
    },
    cardSelected: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
    dayName: { fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
    dayNumber: { fontWeight: '800', color: '#172554', marginVertical: 2 },
    monthName: { fontWeight: '600', color: '#94a3b8' },
    textSelected: { color: '#fff' },
});

export default Schedule;