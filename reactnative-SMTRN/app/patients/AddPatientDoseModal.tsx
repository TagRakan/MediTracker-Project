import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Modal, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { ALL_DAYS, DayOfWeek, BackendMedicine } from '../../services/api';
import api from '../../services/api';
import { addPatientDose, AddDosePayload } from '../../store/doseSlice';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DAY_SHORT, dateToTimeString } from './constants';
import { toDateString } from '../utils/doseHelpers';
import { useTranslation } from '../../context/useTranslation';

interface AddPatientDoseModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: number;
    fs: (n: number) => number;
}

export function AddPatientDoseModal({ visible, onClose, onSuccess, patientId, fs }: AddPatientDoseModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { t, isRTL } = useTranslation();

    const [medicines, setMedicines] = useState<BackendMedicine[]>([]);
    const [medLoading, setMedLoading] = useState(false);
    const [selectedMed, setSelectedMed] = useState<BackendMedicine | null>(null);

    const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['MONDAY']);
    const [time, setTime] = useState<Date>(() => { const d = new Date(); d.setSeconds(0, 0); return d; });
    const [tempTime, setTempTime] = useState<Date>(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [amountMg, setAmountMg] = useState(100);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [startDate, setStartDate] = useState<Date>(today);
    const [endDate, setEndDate] = useState<Date>(() => {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() + 1);
        return d;
    });

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<Date>(today);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [tempEndDate, setTempEndDate] = useState<Date>(() => {
        const d = new Date(today);
        d.setFullYear(d.getFullYear() + 1);
        return d;
    });

    const [submitting, setSubmitting] = useState(false);

    const loadMeds = useCallback(async () => {
        setMedLoading(true);
        try {
            const res = await api.get<BackendMedicine[]>('/api/medication/findall');
            setMedicines(Array.isArray(res.data) ? res.data : []);
        } catch {
            setMedicines([]);
        } finally {
            setMedLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            setSelectedMed(null);
            setSelectedDays(['MONDAY']);
            const d = new Date(); d.setSeconds(0, 0);
            setTime(d);
            setAmountMg(100);
            const t = new Date();
            t.setHours(0, 0, 0, 0);
            setStartDate(t);
            const e = new Date(t);
            e.setFullYear(e.getFullYear() + 1);
            setEndDate(e);
            setTempStartDate(t);
            setTempEndDate(e);
            loadMeds();
        }
    }, [visible]);

    const toggleDay = (d: DayOfWeek) => {
        setSelectedDays(prev =>
            prev.includes(d)
                ? prev.length === 1 ? prev : prev.filter(x => x !== d)
                : [...prev, d]
        );
    };

    const handleTimeChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
            if (d) setTime(d);
        } else {
            if (d) setTempTime(d);
        }
    };

    const handleStartChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setShowStartPicker(false);
            if (d) setStartDate(d);
        } else {
            if (d) setTempStartDate(d);
        }
    };

    const handleEndChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setShowEndPicker(false);
            if (d) setEndDate(d);
        } else {
            if (d) setTempEndDate(d);
        }
    };

    const handleSave = async () => {
        if (!selectedMed) { Alert.alert(t.required, t.medicationRequired); return; }
        if (endDate <= startDate) { Alert.alert(t.doseInvalidDate, t.doseInvalidDateMsg); return; }

        setSubmitting(true);
        const timeStr = dateToTimeString(time);
        const payload: AddDosePayload = {
            name: selectedMed.name,
            dayOfWeek: selectedDays,
            localTime: selectedDays.map(() => timeStr),
            doseInMilligram: selectedDays.map(() => amountMg),
            medicineId: selectedMed.id,
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
        };

        const result = await dispatch(addPatientDose({ patientId, payload }));
        if (addPatientDose.rejected.match(result)) {
            Alert.alert(t.error, String(result.payload ?? t.addDoseFailed));
            setSubmitting(false);
            return;
        }
        setSubmitting(false);
        onClose();
        onSuccess();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, maxHeight: '92%' }}>
                        <View style={{ width: 48, height: 4, backgroundColor: '#e2e8f0', borderRadius: 999, alignSelf: 'center', marginBottom: 16 }} />
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <View>
                                <Text style={{ fontSize: fs(20), fontWeight: 'bold', color: '#172554', textAlign: isRTL ? 'right' : 'left' }}>{t.addDoseTitle}</Text>
                                <Text style={{ fontSize: fs(12), color: '#94a3b8', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{t.addDoseSubtitle}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#f1f5f9', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="close" size={18} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

                            <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>
                                {t.medicationLabel}
                            </Text>
                            {medLoading ? (
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <ActivityIndicator size="large" color="#1e3a8a" />
                                </View>
                            ) : (
                                <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                        {medicines.length === 0 ? (
                                            <Text style={{ fontSize: fs(13), color: '#94a3b8', textAlign: 'center', paddingVertical: 20 }}>{t.noMedicationsFound}</Text>
                                        ) : (
                                            medicines.map((m, idx) => {
                                                const selected = selectedMed?.id === m.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={m.id}
                                                        onPress={() => setSelectedMed(m)}
                                                        activeOpacity={0.7}
                                                        style={{
                                                            paddingHorizontal: 16,
                                                            paddingVertical: 13,
                                                            flexDirection: isRTL ? 'row-reverse' : 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            backgroundColor: selected ? '#eff6ff' : '#fff',
                                                            borderBottomWidth: idx < medicines.length - 1 ? 1 : 0,
                                                            borderBottomColor: '#f1f5f9',
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: fs(14), fontWeight: selected ? '700' : '500', color: selected ? '#1d4ed8' : '#172554', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                                                            {m.name}
                                                        </Text>
                                                        {selected && <Ionicons name="checkmark-circle" size={18} color="#2563eb" />}
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )}
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.daysLabel}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                                {ALL_DAYS.map(d => {
                                    const active = selectedDays.includes(d);
                                    return (
                                        <TouchableOpacity
                                            key={d}
                                            onPress={() => toggleDay(d)}
                                            activeOpacity={0.7}
                                            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, backgroundColor: active ? '#1e3a8a' : '#f1f5f9', borderColor: active ? '#1e3a8a' : '#e2e8f0' }}
                                        >
                                            <Text style={{ fontSize: fs(12), fontWeight: '700', color: active ? '#fff' : '#94a3b8' }}>
                                                {DAY_SHORT[d]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.amountMgLabel}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 48, overflow: 'hidden' }}>
                                        <TouchableOpacity onPress={() => setAmountMg(prev => Math.max(1, prev - 50))} activeOpacity={0.7} style={{ paddingHorizontal: 12, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                                            <Ionicons name="remove" size={16} color="#1e3a8a" />
                                        </TouchableOpacity>
                                        <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: fs(15), color: '#172554' }}>{amountMg}</Text>
                                        <TouchableOpacity onPress={() => setAmountMg(prev => Math.min(5000, prev + 50))} activeOpacity={0.7} style={{ paddingHorizontal: 12, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }}>
                                            <Ionicons name="add" size={16} color="#1e3a8a" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.timeLabel}</Text>
                                    <TouchableOpacity
                                        onPress={() => { setTempTime(new Date(time)); setShowTimePicker(true); }}
                                        activeOpacity={0.7}
                                        style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#172554' }}>
                                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginBottom: 24 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.startDateLabel}</Text>
                                    <TouchableOpacity
                                        onPress={() => { setTempStartDate(new Date(startDate)); setShowStartPicker(true); }}
                                        activeOpacity={0.7}
                                        style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                    >
                                        <Text style={{ fontSize: fs(13), fontWeight: '600', color: '#172554' }}>{toDateString(startDate).replace(/-/g, '/')}</Text>
                                        <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: fs(11), color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t.endDateLabel}</Text>
                                    <TouchableOpacity
                                        onPress={() => { setTempEndDate(new Date(endDate)); setShowEndPicker(true); }}
                                        activeOpacity={0.7}
                                        style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                    >
                                        <Text style={{ fontSize: fs(13), fontWeight: '600', color: '#172554' }}>{toDateString(endDate).replace(/-/g, '/')}</Text>
                                        <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
                                <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} activeOpacity={0.7} disabled={submitting}>
                                    <Text style={{ fontSize: fs(15), color: '#64748b', fontWeight: 'bold' }}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={!selectedMed || submitting}
                                    style={{ flex: 1, backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: selectedMed && !submitting ? 1 : 0.5 }}
                                    activeOpacity={0.7}
                                >
                                    {submitting
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={{ fontSize: fs(15), color: '#fff', fontWeight: 'bold' }}>{t.addDoseBtn}</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={handleTimeChange} />
            )}
            {showStartPicker && Platform.OS === 'android' && (
                <DateTimePicker value={tempStartDate} mode="date" display="calendar" onChange={handleStartChange} />
            )}
            {showEndPicker && Platform.OS === 'android' && (
                <DateTimePicker value={tempEndDate} mode="date" display="calendar" minimumDate={startDate} onChange={handleEndChange} />
            )}

            {Platform.OS === 'ios' && showTimePicker && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
                                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: fs(16) }}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#172554', fontWeight: '700', fontSize: fs(17) }}>{t.selectTimeTitle}</Text>
                                <TouchableOpacity
                                    onPress={() => { setTime(tempTime); setShowTimePicker(false); }}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(16) }}>{t.editDoseDone}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={handleTimeChange} themeVariant="light" accentColor="#3b82f6" textColor="#172554" style={{ backgroundColor: '#fff' }} />
                        </View>
                    </View>
                </Modal>
            )}

            {Platform.OS === 'ios' && showStartPicker && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setShowStartPicker(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
                                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: fs(16) }}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#172554', fontWeight: '700', fontSize: fs(17) }}>{t.startDateTitle}</Text>
                                <TouchableOpacity
                                    onPress={() => { setStartDate(tempStartDate); setShowStartPicker(false); }}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(16) }}>{t.editDoseDone}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker value={tempStartDate} mode="date" display="spinner" onChange={handleStartChange} themeVariant="light" accentColor="#3b82f6" textColor="#172554" style={{ backgroundColor: '#fff' }} />
                        </View>
                    </View>
                </Modal>
            )}

            {Platform.OS === 'ios' && showEndPicker && (
                <Modal visible transparent animationType="slide" onRequestClose={() => setShowEndPicker(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
                                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: fs(16) }}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#172554', fontWeight: '700', fontSize: fs(17) }}>{t.endDateTitle}</Text>
                                <TouchableOpacity
                                    onPress={() => { setEndDate(tempEndDate); setShowEndPicker(false); }}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(16) }}>{t.editDoseDone}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker value={tempEndDate} mode="date" display="spinner" minimumDate={startDate} onChange={handleEndChange} themeVariant="light" accentColor="#3b82f6" textColor="#172554" style={{ backgroundColor: '#fff' }} />
                        </View>
                    </View>
                </Modal>
            )}
        </Modal>
    );
}