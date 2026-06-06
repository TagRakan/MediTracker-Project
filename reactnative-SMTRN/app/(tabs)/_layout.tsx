import React from 'react';
import { Tabs } from "expo-router";
import Octicons from '@expo/vector-icons/Octicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useTranslation } from '../../context/useTranslation';

const ACTIVE_COLOR = "#3B9EF5";
const INACTIVE_COLOR = "#000000";

const _Layout = () => {
    const { t, isRTL } = useTranslation();

    const screens = [
        {
            name: "index",
            title: t.homeTitle,
            icon: ({ focused }: { focused: boolean }) =>
                focused
                    ? <Octicons name="home-fill" size={26} color={ACTIVE_COLOR} />
                    : <Octicons name="home" size={26} color={INACTIVE_COLOR} />,
        },
        {
            name: "doses",
            title: t.dosesTitle,
            icon: ({ focused }: { focused: boolean }) =>
                focused
                    ? <MaterialCommunityIcons name="medication" size={26} color={ACTIVE_COLOR} />
                    : <MaterialCommunityIcons name="medication-outline" size={26} color={INACTIVE_COLOR} />,
        },
        {
            name: "services",
            title: t.services,
            icon: ({ focused }: { focused: boolean }) =>
                focused
                    ? <Ionicons name="apps" size={26} color={ACTIVE_COLOR} />
                    : <Ionicons name="apps-outline" size={26} color={INACTIVE_COLOR} />,
        },
        {
            name: "schedule",
            title: t.scheduleTitle,
            icon: ({ focused }: { focused: boolean }) =>
                focused
                    ? <Ionicons name="calendar-sharp" size={26} color={ACTIVE_COLOR} />
                    : <Ionicons name="calendar-outline" size={26} color={INACTIVE_COLOR} />,
        },
        {
            name: "profile",
            title: t.profileTitle,
            icon: ({ focused }: { focused: boolean }) =>
                focused
                    ? <FontAwesome5 name="user-alt" size={26} color={ACTIVE_COLOR} />
                    : <FontAwesome5 name="user" size={26} color={INACTIVE_COLOR} />,
        },
    ];

    const orderedScreens = isRTL ? [...screens].reverse() : screens;

    return (
        <Tabs>
            {orderedScreens.map((screen) => (
                <Tabs.Screen
                    key={screen.name}
                    name={screen.name}
                    options={{
                        title: screen.title,
                        headerShown: false,
                        tabBarInactiveTintColor: INACTIVE_COLOR,
                        tabBarActiveTintColor: ACTIVE_COLOR,
                        tabBarIcon: screen.icon,
                    }}
                />
            ))}
            <Tabs.Screen
                name="addMedication"
                options={{
                    headerShown: false,
                    href: null,
                    title: t.addMedTitle,
                }}
            />
        </Tabs>
    );
};

export default _Layout;