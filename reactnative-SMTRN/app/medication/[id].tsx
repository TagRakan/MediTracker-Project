import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { addDoses, fetchDoses, AddDosePayload } from '../../store/doseSlice';
import { toDateString } from '../utils/doseHelpers';
import { DayOfWeek, ALL_DAYS } from '../../services/api';
import { useTranslation } from '../../context/useTranslation';
import { useFontScale } from '../../context/FontContext';

const DAY_SHORT_EN: Record<DayOfWeek, string> = {
    MONDAY: 'Mo', TUESDAY: 'Tu', WEDNESDAY: 'We', THURSDAY: 'Th',
    FRIDAY: 'Fr', SATURDAY: 'Sa', SUNDAY: 'Su',
};

const DAY_SHORT_AR: Record<DayOfWeek, string> = {
    MONDAY: 'إث', TUESDAY: 'ثل', WEDNESDAY: 'أر', THURSDAY: 'خم',
    FRIDAY: 'جم', SATURDAY: 'سب', SUNDAY: 'أح',
};

interface DoseEntry {
    id: string;
    amountMg: number;
    time: Date;
    days: DayOfWeek[];
}

function createDefaultDose(id: string): DoseEntry {
    const t = new Date();
    t.setSeconds(0, 0);
    return { id, amountMg: 100, time: t, days: ['MONDAY'] };
}

function filterNoneStr(value: string | undefined): string {
    if (!value) return '';
    return value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.toLowerCase() !== 'none')
        .join(', ');
}

function defaultEndDate(start: Date): Date {
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    return end;
}

function DaySelector({
                         selected,
                         onChange,
                         dayShort,
                         labelText,
                         isRTL,
                     }: {
    selected: DayOfWeek[];
    onChange: (days: DayOfWeek[]) => void;
    dayShort: Record<DayOfWeek, string>;
    labelText: string;
    isRTL: boolean;
}) {
    const toggle = (d: DayOfWeek) => {
        if (selected.includes(d)) {
            if (selected.length === 1) return;
            onChange(selected.filter(x => x !== d));
        } else {
            onChange([...selected, d]);
        }
    };
    return (
        <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>
                {labelText}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ALL_DAYS.map(d => {
                    const active = selected.includes(d);
                    return (
                        <TouchableOpacity
                            key={d}
                            onPress={() => toggle(d)}
                            activeOpacity={0.7}
                            style={{
                                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                                backgroundColor: active ? '#1e3a8a' : '#f1f5f9',
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : '#94a3b8' }}>
                                {dayShort[d]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

function DoseCard({
                      dose,
                      isFirst,
                      onDelete,
                      onChange,
                      removeLabel,
                      amountLabel,
                      timeLabel,
                      dayShort,
                      daysOfWeekLabel,
                      selectTimeLabel,
                      doneLabel,
                      isRTL,
                  }: {
    dose: DoseEntry;
    isFirst: boolean;
    onDelete: (id: string) => void;
    onChange: (id: string, updated: Partial<DoseEntry>) => void;
    removeLabel: string;
    amountLabel: string;
    timeLabel: string;
    dayShort: Record<DayOfWeek, string>;
    daysOfWeekLabel: string;
    selectTimeLabel: string;
    doneLabel: string;
    isRTL: boolean;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(dose.time);

    const openPicker = () => {
        setTempDate(new Date(dose.time));
        setShowPicker(true);
    };

    const onTimeChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (d) onChange(dose.id, { time: d });
        } else {
            if (d) setTempDate(d);
        }
    };

    const onConfirmIOS = () => {
        onChange(dose.id, { time: tempDate });
        setShowPicker(false);
    };

    return (
        <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-3">
            {!isFirst && (
                <View className="flex-row justify-end mb-3" style={{ flexDirection: isRTL ? 'row' : 'row-reverse' }}>
                    <TouchableOpacity
                        onPress={() => onDelete(dose.id)}
                        activeOpacity={0.7}
                        className="flex-row items-center bg-red-50 px-3 py-1 rounded-full"
                    >
                        <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        <Text className="text-red-500 text-xs font-bold ml-1">{removeLabel}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View className="flex-row justify-between items-start mb-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <View className="flex-1 mr-3">
                    <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {amountLabel}
                    </Text>
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden" style={{ height: 48, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <TouchableOpacity
                            onPress={() => onChange(dose.id, { amountMg: Math.max(1, dose.amountMg - 50) })}
                            activeOpacity={0.7}
                            className="px-3 h-full items-center justify-center border-r border-slate-200"
                        >
                            <Ionicons name="remove" size={18} color="#1e3a8a" />
                        </TouchableOpacity>
                        <Text className="flex-1 text-center font-bold text-blue-950">{dose.amountMg}</Text>
                        <TouchableOpacity
                            onPress={() => onChange(dose.id, { amountMg: Math.min(5000, dose.amountMg + 50) })}
                            activeOpacity={0.7}
                            className="px-3 h-full items-center justify-center border-l border-slate-200"
                        >
                            <Ionicons name="add" size={18} color="#1e3a8a" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {timeLabel}
                    </Text>
                    <TouchableOpacity
                        onPress={openPicker}
                        activeOpacity={0.7}
                        className="bg-slate-50 border border-slate-200 rounded-xl items-center justify-center"
                        style={{ height: 48 }}
                    >
                        <Text className="text-base font-bold text-blue-950">
                            {dose.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <DaySelector
                selected={dose.days}
                onChange={(days) => onChange(dose.id, { days })}
                dayShort={dayShort}
                labelText={daysOfWeekLabel}
                isRTL={isRTL}
            />

            {showPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={tempDate}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={onTimeChange}
                />
            )}

            {Platform.OS === 'ios' && (
                <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
                                <TouchableOpacity onPress={() => setShowPicker(false)}>
                                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 16 }}>{isRTL ? 'إلغاء' : 'Cancel'}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#172554', fontWeight: '700', fontSize: 17 }}>{selectTimeLabel}</Text>
                                <TouchableOpacity
                                    onPress={onConfirmIOS}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{doneLabel}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 20 }} />
                            <DateTimePicker
                                value={tempDate}
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
                    </View>
                </Modal>
            )}
        </View>
    );
}

function DateField({
                       label,
                       value,
                       onChange,
                       placeholder,
                       minimumDate,
                       maximumDate,
                       cancelLabel,
                       doneLabel,
                       isRTL,
                   }: {
    label: string;
    value: Date | null;
    onChange: (d: Date) => void;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
    cancelLabel: string;
    doneLabel: string;
    isRTL: boolean;
}) {
    const [show, setShow] = useState(false);
    const [temp, setTemp] = useState<Date>(value ?? new Date());

    const openPicker = () => {
        setTemp(value ?? new Date());
        setShow(true);
    };

    const onNativeChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setShow(false);
            if (d) onChange(d);
        } else {
            if (d) setTemp(d);
        }
    };

    const onConfirmIOS = () => {
        onChange(temp);
        setShow(false);
    };

    const displayValue = value ? toDateString(value).replace(/-/g, '/') : placeholder ?? 'Select';

    return (
        <View className="flex-1">
            <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider" style={{ textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
            <TouchableOpacity
                onPress={openPicker}
                activeOpacity={0.7}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center justify-between"
                style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
                <Text className="font-bold text-blue-950">{displayValue}</Text>
                <Ionicons name="calendar-outline" size={18} color="#1e3a8a" />
            </TouchableOpacity>

            {show && Platform.OS === 'android' && (
                <DateTimePicker
                    value={temp}
                    mode="date"
                    display="calendar"
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    onChange={onNativeChange}
                />
            )}
            {Platform.OS === 'ios' && (
                <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
                                <TouchableOpacity onPress={() => setShow(false)}>
                                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 16 }}>{cancelLabel}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#172554', fontWeight: '700', fontSize: 17 }}>{label}</Text>
                                <TouchableOpacity
                                    onPress={onConfirmIOS}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{doneLabel}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 20 }} />
                            <DateTimePicker
                                value={temp}
                                mode="date"
                                display="spinner"
                                minimumDate={minimumDate}
                                maximumDate={maximumDate}
                                onChange={onNativeChange}
                                themeVariant="light"
                                style={{ backgroundColor: '#fff' }}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

let _nextId = 1;
function newId() { return `dose_${Date.now()}_${_nextId++}`; }

export default function MedicationDosesPage() {
    const { id, name, dose, method, effects, sideEffects, restrictions, existingIdentifier } = useLocalSearchParams<{
        id: string; name?: string; dose?: string; method?: string; effects?: string;
        sideEffects?: string; restrictions?: string; existingIdentifier?: string;
    }>();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { t, isRTL, language } = useTranslation();
    const { fs } = useFontScale();

    const dayShort = language === 'ar' ? DAY_SHORT_AR : DAY_SHORT_EN;

    const backendMedicineId = parseInt(id ?? '0');
    const medName = name;

    const medDose = filterNoneStr(dose);
    const medMethod = filterNoneStr(method);
    const medEffects = filterNoneStr(effects);
    const medSideEffects = filterNoneStr(sideEffects);
    const medRestrictions = filterNoneStr(restrictions);

    const isAddingToCluster = !!existingIdentifier;

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const [doses, setDoses] = useState<DoseEntry[]>([createDefaultDose(newId())]);
    const [startDate, setStartDate] = useState<Date>(today);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [saving, setSaving] = useState(false);

    const handleAddDose = useCallback(() => {
        setDoses(prev => prev.length >= 5 ? prev : [...prev, createDefaultDose(newId())]);
    }, []);

    const handleDeleteDose = useCallback((doseId: string) => {
        setDoses(prev => prev.filter(d => d.id !== doseId));
    }, []);

    const handleChangeDose = useCallback((doseId: string, updated: Partial<DoseEntry>) => {
        setDoses(prev => prev.map(d => d.id === doseId ? { ...d, ...updated } : d));
    }, []);

    const handleStartDateChange = useCallback((d: Date) => {
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        setStartDate(normalized);
        if (endDate && endDate <= normalized) setEndDate(null);
    }, [endDate]);

    const handleSave = useCallback(async () => {
        if (!medName || !backendMedicineId) return;

        const resolvedEnd = endDate ?? defaultEndDate(startDate);

        if (resolvedEnd <= startDate) {
            Alert.alert(t.doseInvalidDate, t.doseInvalidDateMsg);
            return;
        }

        setSaving(true);
        try {
            const allDays: DayOfWeek[] = [];
            const allTimes: string[] = [];
            const allAmounts: number[] = [];

            for (const d of doses) {
                const timeStr = `${d.time.getHours().toString().padStart(2, '0')}:${d.time.getMinutes().toString().padStart(2, '0')}:00`;
                for (const day of d.days) {
                    allDays.push(day);
                    allTimes.push(timeStr);
                    allAmounts.push(d.amountMg);
                }
            }

            const payload: AddDosePayload = {
                name: medName,
                dayOfWeek: allDays,
                localTime: allTimes,
                doseInMilligram: allAmounts,
                medicineId: backendMedicineId,
                startDate: toDateString(startDate),
                endDate: toDateString(resolvedEnd),
                ...(isAddingToCluster && existingIdentifier
                    ? { simpleDoseIdentifier: existingIdentifier }
                    : {}),
            };

            const result = await dispatch(addDoses(payload));

            if (addDoses.rejected.match(result)) {
                Alert.alert(t.error, String(result.payload ?? t.doseSaveFailed));
                setSaving(false);
                return;
            }

            dispatch(fetchDoses());
            router.replace('/(tabs)/doses');
        } catch {
            Alert.alert(t.error, t.doseSaveError);
        } finally {
            setSaving(false);
        }
    }, [doses, startDate, endDate, medName, backendMedicineId, isAddingToCluster, existingIdentifier, t]);

    if (!medName || !backendMedicineId) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-slate-50">
                <Text className="text-slate-400 mb-4">{t.doseMedNotFound}</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-blue-600 font-semibold">{t.doseGoBack}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const minEndDate = new Date(startDate);
    minEndDate.setDate(minEndDate.getDate() + 1);

    const infoChips = [
        { value: medMethod, color: '#eff6ff', textColor: '#1d4ed8' },
        { value: medDose, color: '#f0fdf4', textColor: '#15803d' },
        { value: medEffects, color: '#fefce8', textColor: '#a16207' },
        { value: medSideEffects, color: '#fff1f2', textColor: '#be123c' },
        { value: medRestrictions, color: '#fdf4ff', textColor: '#7e22ce' },
    ].filter(chip => !!chip.value);

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <View className="px-6 pt-4 pb-4 flex-row justify-between items-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="mr-4">
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={28} color="#172554" />
                </TouchableOpacity>
                <Text style={{ fontSize: fs(20), textAlign: isRTL ? 'right' : 'left' }} className="font-bold text-blue-950 flex-1">
                    {isAddingToCluster ? t.doseAddToScheduleTitle : t.doseSetScheduleTitle}
                </Text>
                <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.7}
                    disabled={saving}
                    className="bg-blue-100 rounded-full px-4 py-2"
                    style={{ opacity: saving ? 0.6 : 1 }}
                >
                    {saving
                        ? <ActivityIndicator size="small" color="#1e3a8a" />
                        : <Text className="text-blue-900 font-bold text-base">{t.doseSave}</Text>
                    }
                </TouchableOpacity>
            </View>

            {isAddingToCluster && (
                <View className="mx-6 mb-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex-row items-center" style={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
                    <Text className="text-blue-700 font-medium text-xs flex-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                        {t.doseAddingToClusterBanner(existingIdentifier ?? '')}
                    </Text>
                </View>
            )}

            <View className="px-6 pb-4">
                <View className="flex-row items-baseline flex-wrap" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Text style={{ fontSize: fs(26) }} className="font-bold text-blue-950 tracking-tight">{medName}</Text>
                </View>

                {infoChips.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {infoChips.map((chip, idx) => (
                            <View
                                key={idx}
                                style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: chip.color }}
                            >
                                <Text style={{ fontSize: fs(12), fontWeight: '600', color: chip.textColor }}>
                                    {chip.value}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View className="flex-row mb-2 mx-6" style={{ gap: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <DateField
                    label={t.doseStartOn}
                    value={startDate}
                    onChange={handleStartDateChange}
                    minimumDate={today}
                    cancelLabel={t.editDoseCancel}
                    doneLabel={t.doseDone}
                    isRTL={isRTL}
                />
                <DateField
                    label={t.doseEndBy}
                    value={endDate}
                    onChange={setEndDate}
                    placeholder={t.doseEndByPlaceholder}
                    minimumDate={minEndDate}
                    cancelLabel={t.editDoseCancel}
                    doneLabel={t.doseDone}
                    isRTL={isRTL}
                />
            </View>

            {endDate && (
                <TouchableOpacity
                    onPress={() => setEndDate(null)}
                    className="mx-6 mb-3 flex-row items-center"
                    activeOpacity={0.7}
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                >
                    <Ionicons name="close-circle-outline" size={16} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs font-medium ml-1">{t.doseClearEndDate}</Text>
                </TouchableOpacity>
            )}

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                <View className="flex-row items-center justify-between py-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                    <Text style={{ fontSize: fs(22) }} className="font-medium text-blue-950">
                        {t.doseDosesLabel}{' '}
                        <Text style={{ fontSize: fs(14) }} className="text-slate-400">({doses.length}/5)</Text>
                    </Text>
                    <TouchableOpacity
                        onPress={handleAddDose}
                        disabled={doses.length >= 5}
                        activeOpacity={0.6}
                        className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full"
                        style={{ opacity: doses.length >= 5 ? 0.5 : 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    >
                        <Text className="text-blue-900 font-semibold mr-1">{t.doseAddBtn}</Text>
                        <Ionicons name="add" size={20} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>

                {doses.map((d, idx) => (
                    <DoseCard
                        key={d.id}
                        dose={d}
                        isFirst={idx === 0}
                        onDelete={handleDeleteDose}
                        onChange={handleChangeDose}
                        removeLabel={t.doseRemove}
                        amountLabel={t.doseAmountMg}
                        timeLabel={t.doseTime}
                        dayShort={dayShort}
                        daysOfWeekLabel={t.doseDaysOfWeek}
                        selectTimeLabel={t.doseSelectTime}
                        doneLabel={t.doseDone}
                        isRTL={isRTL}
                    />
                ))}

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
