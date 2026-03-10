import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const TABS = [
    { key: 'home', label: 'Home' },
    { key: 'feed', label: 'Feed' },
    { key: 'chat', label: 'Chat' },
    { key: 'profile', label: 'Profile' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('home');

    const ActiveScreen = useMemo(() => {
        switch (activeTab) {
            case 'feed':
                return FeedScreen;
            case 'chat':
                return ChatScreen;
            case 'profile':
                return ProfileScreen;
            case 'home':
            default:
                return HomeScreen;
        }
    }, [activeTab]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="auto" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Milonexa Mobile</Text>
            </View>

            <View style={styles.screenContainer}>
                <ActiveScreen />
            </View>

            <View style={styles.tabBar}>
                {TABS.map((tab) => {
                    const active = tab.key === activeTab;
                    return (
                        <Pressable
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            style={[styles.tabButton, active && styles.tabButtonActive]}
                        >
                            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E4E7EC',
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    screenContainer: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E4E7EC',
        backgroundColor: '#FFFFFF',
        paddingBottom: 8,
        paddingTop: 8,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    tabButtonActive: {
        backgroundColor: '#EEF4FF',
    },
    tabLabel: {
        color: '#475467',
        fontWeight: '600',
    },
    tabLabelActive: {
        color: '#155EEF',
    },
});
