import { followerCount, isBlocked, searchProfiles } from '@love-it/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, SearchField } from '../components/ui';
import { track } from '../analytics';
import { useApp } from '../store';
import { colors } from '../theme';

export function FindFriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, toggleFollow, unblock } = useApp();
  const [query, setQuery] = useState('');
  const people = useMemo(() => searchProfiles(data, me.id, query), [data, me.id, query]);
  const blocked = people.filter((person) => isBlocked(data, me.id, person.id));
  const open = people.filter((person) => !isBlocked(data, me.id, person.id));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Find friends</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Done</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search people" autoFocus />
        <Text style={styles.kicker}>{query.trim() ? 'PEOPLE' : 'SUGGESTED IN TEL AVIV'}</Text>
      </View>
      <FlatList
        data={[...open, ...blocked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const blockedPerson = isBlocked(data, me.id, item.id);
          const following = data.follows.some(
            (follow) => follow.followerId === me.id && follow.followingId === item.id,
          );
          const followsYou = data.follows.some(
            (follow) => follow.followerId === item.id && follow.followingId === me.id,
          );
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/u/${item.handle}`)}>
              <Avatar initials={item.initials} color={item.avatarColor} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.meta}>
                  @{item.handle}
                  {followsYou ? ' · Follows you' : ''} · {followerCount(data, item.id)} followers
                </Text>
              </View>
              {blockedPerson ? (
                <Pressable style={styles.follow} onPress={() => unblock(item.id)}>
                  <Text style={styles.followText}>Unblock</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.follow, following && styles.following]}
                  onPress={() => {
                    const now = toggleFollow(item.id);
                    if (now) track('user_followed', { target_user_id: item.id, target_handle: item.handle });
                  }}
                >
                  <Text style={[styles.followText, following && styles.followingText]}>
                    {following ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800' },
  cancel: { color: colors.coral, fontWeight: '800', fontSize: 16 },
  kicker: { marginTop: 16, marginBottom: 8, color: colors.muted, fontWeight: '800', letterSpacing: 0.6, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { fontWeight: '800', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 2 },
  follow: {
    backgroundColor: colors.coral,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  following: { backgroundColor: '#F1EBE4' },
  followText: { color: colors.white, fontWeight: '800' },
  followingText: { color: colors.ink },
});
