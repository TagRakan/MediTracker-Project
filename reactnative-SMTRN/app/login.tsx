import './global.css';
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import {
    loginUser, registerUser, setError, clearMessages,
    LOGIN_BAD_CREDENTIALS, LOGIN_USER_NOT_FOUND,
} from '../store/authSlice';
import { AppDispatch, RootState } from '../store/store';
import { useTranslation } from '../context/useTranslation';
import { changeLanguage } from '../store/languageSlice';

/* type RoleOption = { label: string; value: string; icon: string; desc: string }; */

const Login = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { t, isRTL, language } = useTranslation();
/*
    const ROLE_OPTIONS: RoleOption[] = [
        { label: t.loginRolePatient, value: 'user', icon: 'person-outline', desc: t.loginRolePatientDesc },
        { label: t.loginRoleDoctor, value: 'moderator', icon: 'medkit-outline', desc: t.loginRoleDoctorDesc },
    ];
*/

    const resolveLoginError = (raw: string): string => {
        if (raw === LOGIN_BAD_CREDENTIALS) return t.loginErrBadCredentials;
        if (raw === LOGIN_USER_NOT_FOUND)  return t.loginErrNotFound;
        return raw;
    };

    const resolveRegisterError = (raw: string): string => {
        const lower = raw.toLowerCase();
        if (lower.includes('already in use') || lower.includes('already exists')) {
            return t.loginErrAlreadyExists;
        }
        return raw;
    };

    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [dob, setDob] = useState<Date | null>(null);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [tempDob, setTempDob] = useState(new Date(2000, 0, 1));
    const [selectedRole, setSelectedRole] = useState<string>('user');
    const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);

    const { loading, error, responseMessage } = useSelector((s: RootState) => s.auth);

    useEffect(() => {
        if (!isLogin && responseMessage) {
            setRegistrationSuccessMsg(responseMessage);
            setName(''); setEmail(''); setPassword('');
            setConfirmPassword(''); setDob(null);
            setSelectedRole('user');
            dispatch(clearMessages());
            setIsLogin(true);
        }
    }, [responseMessage]);

    useEffect(() => {
        if (registrationSuccessMsg && (email || password)) {
            setRegistrationSuccessMsg(null);
        }
    }, [email, password]);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const formatDob = (d: Date) =>
        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    const validateLogin = (): string | null => {
        if (!email.trim()) return t.loginValEmailRequired;
        if (!emailRegex.test(email.trim())) return t.loginValEmailInvalid;
        if (!password.trim()) return t.loginValPasswordRequired;
        return null;
    };

    const validateRegister = (): string | null => {
        if (!name.trim()) return t.loginValNameRequired;
        if (name.trim().length < 2) return t.loginValNameShort;
        if (name.trim().length > 60) return t.loginValNameLong;
        if (!email.trim()) return t.loginValEmailRequired;
        if (!emailRegex.test(email.trim())) return t.loginValEmailInvalid;
        if (!password) return t.loginValPasswordRequired;
        if (password.length < 6) return t.loginValPasswordShort;
        if (!/[A-Za-z]/.test(password)) return t.loginValPasswordLetter;
        if (!/[0-9]/.test(password)) return t.loginValPasswordNumber;
        if (!confirmPassword) return t.loginValConfirmRequired;
        if (password !== confirmPassword) return t.loginValPasswordMatch;
        if (!dob) return t.loginValDobRequired;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (dob > oneYearAgo) return t.loginValDobInvalid;
        return null;
    };

    const handleSubmit = () => {
        dispatch(clearMessages());
        setRegistrationSuccessMsg(null);

        if (isLogin) {
            const loginError = validateLogin();
            if (loginError) { dispatch(setError(loginError)); return; }
            dispatch(loginUser({ username: email.trim(), password }));
        } else {
            const registerError = validateRegister();
            if (registerError) { dispatch(setError(registerError)); return; }
            dispatch(registerUser({
                username: email.trim(),
                password,
                name: name.trim(),
                birthdate: formatDob(dob!),
                roles: [selectedRole],
            }));
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setName(''); setEmail(''); setPassword('');
        setConfirmPassword(''); setDob(null);
        setSelectedRole('user');
        setRegistrationSuccessMsg(null);
        dispatch(clearMessages());
    };

    const toggleLanguage = () => {
        dispatch(changeLanguage(language === 'en' ? 'ar' : 'en'));
    };

    const displayError = error
        ? (isLogin ? resolveLoginError(error) : resolveRegisterError(error))
        : null;

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6" keyboardShouldPersistTaps="handled">

                    {/* Language toggle */}
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', marginTop: 16 }}>
                        <TouchableOpacity
                            onPress={toggleLanguage}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: '#fff',
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                borderRadius: 20,
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                            }}
                        >
                            <Ionicons name="language-outline" size={16} color="#1e3a8a" />
                            <Text style={{ color: '#1e3a8a', fontWeight: '700', fontSize: 13 }}>
                                {language === 'en' ? 'العربية' : 'English'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-10 mb-6">
                        <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-4xl font-bold text-blue-950">
                            {isLogin ? t.loginSignIn : t.loginCreateAccount}
                        </Text>
                        <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-500 mt-2 text-lg">
                            {isLogin ? t.loginWelcomeBack : t.loginSetupProfile}
                        </Text>
                    </View>

                    {!!displayError && (
                        <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-center"
                              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                            <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-red-600 font-medium ml-2 flex-1">{displayError}</Text>
                        </View>
                    )}

                    {!!registrationSuccessMsg && (
                        <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex-row items-center"
                              style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
                            <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-green-700 font-medium ml-2 flex-1">
                                {registrationSuccessMsg} {t.loginNowSignIn}
                            </Text>
                        </View>
                    )}

                    <View className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">

                        {!isLogin && (
                            <View className="mb-4">
                                <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-700 font-semibold mb-2 ml-1">{t.loginFullName}</Text>
                                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14"
                                      style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <Ionicons name="person-outline" size={20} color="#64748b" />
                                    <TextInput
                                        placeholder={t.loginFullNamePlaceholder}
                                        className="flex-1 ml-3 text-slate-900"
                                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                                        placeholderTextColor="#94a3b8"
                                        value={name}
                                        onChangeText={setName}
                                        maxLength={60}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>
                        )}

                        <View className="mb-4">
                            <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-700 font-semibold mb-2 ml-1">{t.loginEmail}</Text>
                            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14"
                                  style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <Ionicons name="mail-outline" size={20} color="#64748b" />
                                <TextInput
                                    placeholder="example@mail.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    className="flex-1 ml-3 text-slate-900"
                                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                                    placeholderTextColor="#94a3b8"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-700 font-semibold mb-2 ml-1">{t.loginPassword}</Text>
                            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14"
                                  style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                                <TextInput
                                    placeholder={isLogin ? t.loginPasswordPlaceholder : t.loginPasswordHint}
                                    secureTextEntry={!showPassword}
                                    className="flex-1 ml-3 text-slate-900"
                                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                                    placeholderTextColor="#94a3b8"
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                            {!isLogin && (
                                <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-400 text-xs mt-1 ml-1">
                                    {t.loginPasswordRule}
                                </Text>
                            )}
                        </View>

                        {!isLogin && (
                            <View className="mb-4">
                                <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-700 font-semibold mb-2 ml-1">{t.loginConfirmPassword}</Text>
                                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14"
                                      style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                                    <TextInput
                                        placeholder={t.loginConfirmPasswordPlaceholder}
                                        secureTextEntry={!showConfirmPassword}
                                        className="flex-1 ml-3 text-slate-900"
                                        style={{ textAlign: isRTL ? 'right' : 'left' }}
                                        placeholderTextColor="#94a3b8"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                {confirmPassword.length > 0 && confirmPassword !== password && (
                                    <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-red-500 text-xs mt-1 ml-1">{t.loginValPasswordMatch}</Text>
                                )}
                            </View>
                        )}

                        {!isLogin && (
                            <View className="mb-4">
                                <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-700 font-semibold mb-2 ml-1">{t.loginDob}</Text>
                                <TouchableOpacity
                                    onPress={() => { setTempDob(dob ?? new Date(2000, 0, 1)); setShowDobPicker(true); }}
                                    className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14"
                                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="calendar-outline" size={20} color="#64748b" />
                                    <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className={`flex-1 ml-3 ${dob ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {dob ? formatDob(dob) : t.loginDobPlaceholder}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/*!isLogin && (
                            <View className="mb-5">
                                <Text style={{ textAlign: isRTL ? 'right' : 'left' }} className="text-slate-700 font-semibold mb-2 ml-1">{t.loginIAm}</Text>
                                <View className="flex-row" style={{ gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                                    {ROLE_OPTIONS.map(role => (
                                        <TouchableOpacity
                                            key={role.value}
                                            onPress={() => setSelectedRole(role.value)}
                                            activeOpacity={0.7}
                                            className={`flex-1 rounded-2xl p-4 border items-center ${
                                                selectedRole === role.value
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'bg-slate-50 border-slate-200'
                                            }`}
                                        >
                                            <Ionicons
                                                name={role.icon as any}
                                                size={22}
                                                color={selectedRole === role.value ? '#fff' : '#64748b'}
                                            />
                                            <Text className={`font-bold text-sm mt-2 text-center ${
                                                selectedRole === role.value ? 'text-white' : 'text-blue-950'
                                            }`}>
                                                {role.label}
                                            </Text>
                                            <Text className={`text-[10px] text-center mt-0.5 ${
                                                selectedRole === role.value ? 'text-blue-100' : 'text-slate-400'
                                            }`}>
                                                {role.desc}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )*/}

                        {isLogin && (
                            <TouchableOpacity className="mb-5" style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end' }}>
                                <Text className="text-blue-600 font-medium">{t.loginForgotPassword}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            activeOpacity={0.8}
                            className="bg-blue-950 h-14 rounded-2xl items-center justify-center shadow-md"
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="white" />
                                : <Text className="text-white font-bold text-lg">{isLogin ? t.loginSignInBtn : t.loginSignUpBtn}</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-center mt-8 mb-8" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <Text className="text-slate-500 text-base">
                            {isLogin ? t.loginNoAccount : t.loginHaveAccount}
                        </Text>
                        <TouchableOpacity onPress={switchMode}>
                            <Text className="text-blue-600 font-bold text-base">
                                {isLogin ? t.loginSignUpBtn : t.loginSignInBtn}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {Platform.OS === 'ios' && (
                <Modal visible={showDobPicker} transparent animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 }}>
                                <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                                    <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 16 }}>{t.cancel}</Text>
                                </TouchableOpacity>
                                <Text style={{ color: '#172554', fontWeight: '700', fontSize: 17 }}>{t.loginDob}</Text>
                                <TouchableOpacity
                                    onPress={() => { setDob(tempDob); setShowDobPicker(false); }}
                                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>{t.doseDone}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempDob} mode="date" display="spinner"
                                maximumDate={new Date()}
                                onChange={(_: DateTimePickerEvent, d?: Date) => { if (d) setTempDob(d); }}
                                themeVariant="light" style={{ backgroundColor: '#fff' }}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {showDobPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={tempDob} mode="date" display="calendar" maximumDate={new Date()}
                    onChange={(_: DateTimePickerEvent, d?: Date) => {
                        setShowDobPicker(false);
                        if (d) setDob(d);
                    }}
                />
            )}
        </SafeAreaView>
    );
};

export default Login;