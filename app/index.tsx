import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActionButton, ScreenContainer, SectionTitle } from '@/components/ui';
import { pokerTheme } from '@/constants/theme';
import { isRemoteSyncEnabled } from '@/lib/config';
import { checkRemoteSyncHealth } from '@/lib/remote-sync';
import {
  loadLastActiveRoomCode,
  loadRecentTournaments,
  loadTournament,
} from '@/lib/tournament-sync';
import { useTournament } from '@/lib/tournament-store';
import { SavedTournamentSummary } from '@/types/saved-tournament';

function formatSavedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomeScreen() {
  const { loadRoom } = useTournament();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<SavedTournamentSummary[]>([]);
  const [lastActive, setLastActive] = useState<SavedTournamentSummary | null>(null);
  const [syncOnline, setSyncOnline] = useState<boolean | null>(null);

  const refreshSaved = useCallback(async () => {
    if (isRemoteSyncEnabled()) {
      setSyncOnline(await checkRemoteSyncHealth());
    } else {
      setSyncOnline(null);
    }

    const [items, lastCode] = await Promise.all([
      loadRecentTournaments(),
      loadLastActiveRoomCode(),
    ]);
    setRecent(items);
    if (lastCode) {
      const tournament = await loadTournament(lastCode);
      if (tournament) {
        setLastActive({
          roomCode: tournament.roomCode,
          name: tournament.name,
          updatedAt: tournament.updatedAt,
          playerCount: tournament.players.length,
          statusLabel: items.find((item) => item.roomCode === lastCode)?.statusLabel ?? 'Tournoi',
        });
        return;
      }
    }
    setLastActive(items[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSaved();
    }, [refreshSaved])
  );

  const openTournament = async (code: string, options?: { joinRemote?: boolean }) => {
    const normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setError('Entrez un code de salle valide.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isRemoteSyncEnabled() && options?.joinRemote) {
        void loadRoom(normalized);
        router.push(`/control/${normalized}`);
        return;
      }

      const tournament = await loadRoom(normalized);
      if (!tournament) {
        setError(
          isRemoteSyncEnabled()
            ? 'Tournoi introuvable. Vérifiez le code ou demandez à l’organisateur de synchroniser.'
            : 'Tournoi introuvable sur cet appareil.'
        );
        return;
      }
      router.push(`/control/${normalized}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    await openTournament(roomCode, { joinRemote: isRemoteSyncEnabled() });
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.badge}>Poker Asso</Text>
          <Text style={styles.title}>Organisez vos tournois</Text>
          <Text style={styles.subtitle}>
            {isRemoteSyncEnabled()
              ? 'Connectez n’importe quel téléphone ou PC avec le code salle. L’écran TV et le contrôle se synchronisent en direct.'
              : 'Vos tournois sont enregistrés sur cet appareil. Configurez EXPO_PUBLIC_SYNC_URL pour accéder depuis n’importe où.'}
          </Text>

          {isRemoteSyncEnabled() ? (
            <View
              style={[
                styles.syncBanner,
                syncOnline === false && styles.syncBannerOffline,
              ]}
            >
              <Text
                style={[
                  styles.syncBannerText,
                  syncOnline === false && styles.syncBannerTextOffline,
                ]}
              >
                {syncOnline === null
                  ? 'Vérification du serveur…'
                  : syncOnline
                    ? 'Sync cloud active'
                    : 'Serveur de sync injoignable'}
              </Text>
            </View>
          ) : null}

          {lastActive ? (
            <View style={styles.resumeCard}>
              <Text style={styles.resumeLabel}>Reprendre rapidement</Text>
              <Text style={styles.resumeTitle}>{lastActive.name}</Text>
              <Text style={styles.resumeMeta}>
                Salle {lastActive.roomCode} · {lastActive.statusLabel} ·{' '}
                {lastActive.playerCount} joueur{lastActive.playerCount > 1 ? 's' : ''}
              </Text>
              <ActionButton
                label={loading ? 'Ouverture…' : 'Reprendre le tournoi'}
                onPress={() => openTournament(lastActive.roomCode)}
                disabled={loading}
              />
            </View>
          ) : null}

          {recent.length > 0 ? (
            <View style={styles.card}>
              <SectionTitle>Tournois enregistrés</SectionTitle>
              {recent.map((item) => (
                <Pressable
                  key={item.roomCode}
                  onPress={() => openTournament(item.roomCode)}
                  style={styles.recentRow}
                >
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentName}>{item.name}</Text>
                    <Text style={styles.recentMeta}>
                      {item.roomCode} · {item.statusLabel} · {formatSavedDate(item.updatedAt)}
                    </Text>
                  </View>
                  <Text style={styles.recentAction}>Ouvrir</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <SectionTitle>Créer un tournoi</SectionTitle>
            <Text style={styles.hintInline}>
              Définissez les entrées, les jetons et la structure avant d’ajouter les joueurs.
            </Text>
            <ActionButton
              label="Configurer un nouveau tournoi"
              onPress={() => router.push('/create')}
            />
          </View>

          <View style={styles.card}>
            <SectionTitle>Rejoindre une salle</SectionTitle>
            <Text style={styles.hintInline}>
              {isRemoteSyncEnabled()
                ? 'Entrez le code affiché sur le téléphone de l’organisateur. La connexion peut prendre jusqu’à 30 s.'
                : 'Le tournoi doit déjà exister sur cet appareil.'}
            </Text>
            <Text style={styles.label}>Code salle</Text>
            <TextInput
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
              placeholder="ABC123"
              placeholderTextColor={pokerTheme.textMuted}
              style={styles.input}
            />
            <ActionButton
              label="Ouvrir le contrôle"
              onPress={handleJoin}
              variant="secondary"
              disabled={loading}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 24,
    gap: 20,
    paddingBottom: 40,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: pokerTheme.surfaceAlt,
    color: pokerTheme.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
  },
  title: {
    color: pokerTheme.text,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: pokerTheme.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  syncBanner: {
    alignSelf: 'flex-start',
    backgroundColor: pokerTheme.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: pokerTheme.goldMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncBannerOffline: {
    borderColor: pokerTheme.danger,
  },
  syncBannerText: {
    color: pokerTheme.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  syncBannerTextOffline: {
    color: pokerTheme.danger,
  },
  resumeCard: {
    backgroundColor: pokerTheme.felt,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: pokerTheme.gold,
    gap: 10,
  },
  resumeLabel: {
    color: pokerTheme.gold,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  resumeTitle: {
    color: pokerTheme.text,
    fontSize: 24,
    fontWeight: '800',
  },
  resumeMeta: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    gap: 12,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: pokerTheme.border,
  },
  recentInfo: {
    flex: 1,
    gap: 4,
  },
  recentName: {
    color: pokerTheme.text,
    fontWeight: '700',
    fontSize: 16,
  },
  recentMeta: {
    color: pokerTheme.textMuted,
    fontSize: 13,
  },
  recentAction: {
    color: pokerTheme.gold,
    fontWeight: '700',
  },
  hintInline: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: pokerTheme.textMuted,
    fontSize: 14,
  },
  input: {
    backgroundColor: pokerTheme.background,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    borderRadius: 12,
    color: pokerTheme.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: pokerTheme.danger,
    fontSize: 14,
  },
});
