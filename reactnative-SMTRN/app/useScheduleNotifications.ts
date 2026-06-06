import { useEffect, useRef } from 'react';
import { DisplayDose } from '../app/utils/doseHelpers';
import { DoseLog } from '../store/doseLogSlice';
import { scheduleDoseNotifications, cancelDoseNotifications } from './notificationService';
import { useTranslation } from '../context/useTranslation';

export function useScheduleDoseNotifications(
    todayDoses: DisplayDose[],
    logs: DoseLog[]
) {
    const { t } = useTranslation();
    const prevLoggedKeys = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unloggedDoses = todayDoses.filter(d => !logs.find(l => l.doseKey === d.doseKey));

        const loggedKeys = new Set(logs.map(l => l.doseKey));

        loggedKeys.forEach(key => {
            if (!prevLoggedKeys.current.has(key)) {
                cancelDoseNotifications(key);
            }
        });

        prevLoggedKeys.current = loggedKeys;

        if (unloggedDoses.length === 0) return;

        scheduleDoseNotifications(unloggedDoses, {
            soonTitle: t.notifSoonTitle,
            soonBody: (name, time) => t.notifSoonBody(name, time),
            nowTitle: t.notifNowTitle,
            nowBody: (name, time) => t.notifNowBody(name, time),
            overdueTitle: t.notifOverdueTitle,
            overdueBody: (name, time) => t.notifOverdueBody(name, time),
        });
    }, [todayDoses, logs]);
}