import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { feedApi } from '../api/client';
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

export default function FeedScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async () => {
    try {
      setError('');
      const payload = await feedApi.list(DEMO_USER.id);
      setItems(normalizeItems(payload));
    } catch (err) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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
        data={items}
        keyExtractor={(item, index) => item.id?.toString() || `feed-${index}`}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFeed();
            }}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No feed items available yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.author}>{item.user?.name || item.author || 'Unknown author'}</Text>
            <Text style={styles.content}>{item.content || 'No content'}</Text>
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
  author: {
    fontWeight: '700',
    marginBottom: 6,
  },
  content: {
    color: '#344054',
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
