import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DEMO_USER } from '../constants/demoUser';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{`${DEMO_USER.firstName} ${DEMO_USER.lastName}`}</Text>
      <Text style={styles.caption}>Profile integration scaffold (Phase 13.3)</Text>
      <Text style={styles.meta}>User ID: {DEMO_USER.id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  caption: {
    color: '#475467',
    marginBottom: 8,
  },
  meta: {
    color: '#667085',
    fontSize: 12,
  },
});
