import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    Modal, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { ALL_DAYS, DayOfWeek, BackendDose } from '../../services/api';
import { editPatientDose, EditDosePayload } from '../../store/doseSlice';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DAY_SHORT, timeToDate, dateToTimeString } from './constants';
import { formatTime, parseBackendTime } from '../utils/doseHelpers';
import { useTranslation } from '../../context/useTranslation';

interface EditPatientDoseModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    dose: BackendDose | null;
    fs: (n: number) => number;
}

export function EditPatientDoseModal({ visible, onClose, onSuccess, dose, fs }: EditPatientDoseModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { t, isRTL } = useTranslation();

    const [selectedDay, setSelectedDay] = useState<DayOfWeek>('MONDAY');
    const [time, setTime] = useState<Date>(new Date());
    const [tempTime, setTempTime] = useState<Date>(new Date());
    const [amountMg, setAmountMg] = useState(100);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible && dose) {
            setSelectedDay(dose.doseDay);
            const hhmm = parseBackendTime(dose.localTime);
            setTime(timeToDate(hhmm));
            setAmountMg(dose.doseInMilligram);
        }
    }, [visible, dose]);

    const handleTimeChange = (_: DateTimePickerEvent, d?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
            if (d) setTime(d);
        } else {
            if (d) setTempTime(d);
        }
    };

    const handleSave = async () => {
        if (!dose) return;
        setSaving(true);

        const payload: EditDosePayload = {
            id: dose.id,
            name: dose.name,
            dayOfWeek: selectedDay,
            localTime: dateToTimeString(time),
            doseInMilligram: amountMg,
            MedicineId: dose.medicine.id,
        };

        const result = await dispatch(editPatientDose(payload));
        if (editPatientDose.rejected.match(result)) {
            Alert.alert(t.error, String(result.payload ?? t.failedSaveChanges));
            setSaving(false);
            return;
        }
        setSaving(false);
        onClose();
        onSuccess();
    };

    if (!dose) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: '#f8fafc', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                        <TouchableOpacity onPress={onClose} disabled={saving}>
                            <Text style={{ fontSize: fs(16), color: '#64748b', fontWeight: '600' }}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: fs(17), color: '#172554', fontWeight: '700' }}>{t.editPatientDoseTitle}</Text>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, opacity: saving ? 0.6 : 1 }}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={{ fontSize: fs(15), color: '#fff', fontWeight: '700' }}>{t.editDoseSave}</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
                        <Text style={{ fontSize: fs(13), color: '#94a3b8', fontWeight: '600', marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                            {dose.medicine?.name ?? dose.name}
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
                        <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{t.editDoseDay}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {ALL_DAYS.map(d => {
                                    const active = selectedDay === d;
                                    return (
                                        <TouchableOpacity
                                            key={d}
                                            onPress={() => setSelectedDay(d)}
                                            activeOpacity={0.7}
                                            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: active ? '#1e3a8a' : '#f1f5f9' }}
                                        >
                                            <Text style={{ fontSize: fs(13), fontWeight: '700', color: active ? '#fff' : '#94a3b8' }}>
                                                {DAY_SHORT[d]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{t.editDoseAmount}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 52, overflow: 'hidden' }}>
                                    <TouchableOpacity onPress={() => setAmountMg(prev => Math.max(1, prev - 50))} activeOpacity={0.7} style={{ paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                                        <Ionicons name="remove" size={18} color="#1e3a8a" />
                                    </TouchableOpacity>
                                    <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: fs(15), color: '#172554' }}>{amountMg}</Text>
                                    <TouchableOpacity onPress={() => setAmountMg(prev => Math.min(5000, prev + 50))} activeOpacity={0.7} style={{ paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }}>
                                        <Ionicons name="add" size={18} color="#1e3a8a" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: fs(11), fontWeight: '700', color: '#94a3b8', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{t.editDoseTime}</Text>
                                <TouchableOpacity
                                    onPress={() => { setTempTime(new Date(time)); setShowTimePicker(true); }}
                                    activeOpacity={0.7}
                                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={{ fontWeight: '700', fontSize: fs(15), color: '#172554' }}>
                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {showTimePicker && Platform.OS === 'android' && (
                        <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={handleTimeChange} />
                    )}

                    {Platform.OS === 'ios' && showTimePicker && (
                        <View style={{ marginTop: 12 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 }}>
                                <Text style={{ fontSize: fs(14), color: '#64748b', fontWeight: '600' }}>{t.editDoseSelectTime}</Text>
                                <TouchableOpacity
                                    onPress={() => { setTime(tempTime); setShowTimePicker(false); }}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: fs(14) }}>{t.editDoseDone}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker value={tempTime} mode="time" is24Hour={false} display="spinner" onChange={handleTimeChange} themeVariant="light" accentColor="#3b82f6" textColor="#172554" style={{ backgroundColor: '#fff' }} />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}