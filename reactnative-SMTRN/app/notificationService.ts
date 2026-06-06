import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DisplayDose } from '../app/utils/doseHelpers';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('dose-reminders', {
            name: 'Dose Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563eb',
            sound: 'default',
        });
    }

    const existingPermission = await Notifications.getPermissionsAsync() as any;
    if (existingPermission.granted) return true;

    const newPermission = await Notifications.requestPermissionsAsync() as any;
    return newPermission.granted === true;
}

function buildTriggerDate(dateStr: string, hhmm: string, offsetMinutes: number): Date | null {
    try {
        const [h, m] = hhmm.split(':').map(Number);
        const base = new Date(`${dateStr}T00:00:00`);
        base.setHours(h, m + offsetMinutes, 0, 0);
        if (base.getTime() <= Date.now()) return null;
        return base;
    } catch {
        return null;
    }
}

export async function scheduleDoseNotifications(
    doses: DisplayDose[],
    translations: {
        soonTitle: string;
        soonBody: (name: string, time: string) => string;
        nowTitle: string;
        nowBody: (name: string, time: string) => string;
        overdueTitle: string;
        overdueBody: (name: string, time: string) => string;
    }
): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const granted = await requestNotificationPermissions();
    if (!granted) return;

    for (const dose of doses) {
        const soonTrigger = buildTriggerDate(dose.date, dose.time, -30);
        if (soonTrigger) {
            await Notifications.scheduleNotificationAsync({
                identifier: `dose-soon-${dose.doseKey}`,
                content: {
                    title: translations.soonTitle,
                    body: translations.soonBody(dose.medicineName, dose.displayTime),
                    data: { doseKey: dose.doseKey, type: 'soon' },
                    sound: 'default',
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: soonTrigger },
            });
        }

        const nowTrigger = buildTriggerDate(dose.date, dose.time, 0);
        if (nowTrigger) {
            await Notifications.scheduleNotificationAsync({
                identifier: `dose-now-${dose.doseKey}`,
                content: {
                    title: translations.nowTitle,
                    body: translations.nowBody(dose.medicineName, dose.displayTime),
                    data: { doseKey: dose.doseKey, type: 'now' },
                    sound: 'default',
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nowTrigger },
            });
        }

        const overdueTrigger = buildTriggerDate(dose.date, dose.time, 30);
        if (overdueTrigger) {
            await Notifications.scheduleNotificationAsync({
                identifier: `dose-overdue-${dose.doseKey}`,
                content: {
                    title: translations.overdueTitle,
                    body: translations.overdueBody(dose.medicineName, dose.displayTime),
                    data: { doseKey: dose.doseKey, type: 'overdue' },
                    sound: 'default',
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: overdueTrigger },
            });
        }
    }
}

export async function cancelDoseNotifications(doseKey: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(`dose-soon-${doseKey}`);
    await Notifications.cancelScheduledNotificationAsync(`dose-now-${doseKey}`);
    await Notifications.cancelScheduledNotificationAsync(`dose-overdue-${doseKey}`);
}

export async function cancelAllDoseNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}