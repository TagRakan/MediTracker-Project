import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FontScale = 'small' | 'default' | 'large' | 'xlarge';

interface FontContextType {
    fontScale: FontScale;
    setFontScale: (scale: FontScale) => void;
    fs: (base: number) => number;
}

const SCALE_MULTIPLIERS: Record<FontScale, number> = {
    small: 0.85,
    default: 1,
    large: 1.2,
    xlarge: 1.45,
};

const FontContext = createContext<FontContextType>({
    fontScale: 'default',
    setFontScale: () => {},
    fs: (base) => base,
});

export function FontProvider({ children }: { children: ReactNode }) {
    const [fontScale, setFontScaleState] = useState<FontScale>('default');

    useEffect(() => {
        AsyncStorage.getItem('fontScale').then(val => {
            if (val) setFontScaleState(val as FontScale);
        });
    }, []);

    const setFontScale = async (scale: FontScale) => {
        setFontScaleState(scale);
        await AsyncStorage.setItem('fontScale', scale);
    };

    const fs = (base: number) => Math.round(base * SCALE_MULTIPLIERS[fontScale]);

    return (
        <FontContext.Provider value={{ fontScale, setFontScale, fs }}>
            {children}
        </FontContext.Provider>
    );
}

export function useFontScale() {
    return useContext(FontContext);
}