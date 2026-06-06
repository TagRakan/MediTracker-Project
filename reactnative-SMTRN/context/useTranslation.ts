import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { translations, Translations } from './i18n';

export function useTranslation(): {
    t: Translations;
    isRTL: boolean;
    language: 'en' | 'ar';
} {
    const language = useSelector((s: RootState) => s.language.language);
    return {
        t: translations[language] as Translations,
        isRTL: language === 'ar',
        language,
    };
}