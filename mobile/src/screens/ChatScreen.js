import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { messagingApi } from '../api/client';
import { DEMO_USER } from '../constants/demoUser';

const normalizeItems = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
};

export default function ChatScreen() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadConversations = useCallback(async () => {
        try {
            setError('');
            const payload = await messagingApi.conversations(DEMO_USER.id);
            setConversations(normalizeItems(payload));
        } catch (err) {
            setError(err.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FlatList
                data={conversations}
                keyExtractor={(item, index) => item.id?.toString() || `conversation-${index}`}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadConversations();
                        }}
                    />
                )}
                ListEmptyComponent={<Text style={styles.empty}>No conversations available yet.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.title}>{item.name || 'Conversation'}</Text>
                        <Text style={styles.subtitle}>{item.lastMessage || 'No recent messages'}</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E4E7EC',
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        color: '#475467',
    },
    error: {
        color: '#B42318',
        marginBottom: 10,
    },
    empty: {
        color: '#667085',
        textAlign: 'center',
        marginTop: 32,
    },
});
