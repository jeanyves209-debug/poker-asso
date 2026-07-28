import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EntrySetupForm, EntrySetupSummary } from '@/components/EntrySetupForm';
import { LevelSetupForm } from '@/components/LevelSetupForm';
import { PayoutSetupForm } from '@/components/PayoutSetupForm';
import { ActionButton, ScreenContainer, SectionTitle, StatCard } from '@/components/ui';
import { pokerTheme } from '@/constants/theme';
import { copyToClipboard, getDisplayUrlAsync } from '@/lib/tournament-sync';
import { isRemoteSyncEnabled } from '@/lib/config';
import { useLiveRemainingSeconds } from '@/lib/use-live-timer';
import { useTournamentRoom } from '@/lib/use-tournament-room';
import {
  canAddAddOn,
  canAddRebuy,
  getBlindLevelDisplayNumber,
  formatBlinds,
  formatChips,
  formatLevelDurationLabel,
  formatNextLevelPreview,
  formatMoney,
  formatTime,
  isBreakLevel,
  getActivePlayers,
  getAddOnCount,
  getAverageStack,
  getBuyInCount,
  getPlayerChips,
  getMaxBlindLevel,
  getPrizePool,
  getLateRegistrationLabel,
  isLateRegistrationOpen,
  getRebuyCount,
  getTotalChips,
  getTotalEntries,
  isEntryEditable,
} from '@/lib/tournament-utils';
import { BlindLevel, Player, Tournament } from '@/types/tournament';

type TabKey = 'timer' | 'players' | 'levels' | 'settings';

export default function ControlScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const roomCode = (roomId ?? '').toUpperCase();
  const { tournament, dispatch, isLoading, cloudSynced, syncToCloud, refresh } =
    useTournamentRoom(roomCode);
  const liveRemainingSeconds = useLiveRemainingSeconds(tournament);
  const [tab, setTab] = useState<TabKey>('timer');
  const [playerName, setPlayerName] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [displayUrl, setDisplayUrl] = useState('');

  useEffect(() => {
    void getDisplayUrlAsync(roomCode).then(setDisplayUrl);
  }, [roomCode]);

  useEffect(() => {
    if (!isLoading && !tournament && roomCode && !isRemoteSyncEnabled()) {
      router.replace('/');
    }
  }, [isLoading, tournament, roomCode]);

  const currentLevel = tournament?.levels[tournament.currentLevelIndex];
  const nextLevel = tournament?.levels[tournament.currentLevelIndex + 1];

  const stats = useMemo(() => {
    if (!tournament) {
      return null;
    }
    return {
      active: getActivePlayers(tournament).length,
      total: tournament.players.length,
      buyIns: getBuyInCount(tournament),
      rebuys: getRebuyCount(tournament),
      addOns: getAddOnCount(tournament),
      entries: getTotalEntries(tournament),
      prizePool: getPrizePool(tournament),
      avgStack: getAverageStack(tournament),
      totalChips: getTotalChips(tournament),
    };
  }, [tournament]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Connexion à la salle {roomCode}…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!tournament) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Salle {roomCode}</Text>
          <Text style={styles.waitingHint}>
            {isRemoteSyncEnabled()
              ? 'En attente du tournoi sur le serveur. L’organisateur doit ouvrir le contrôle et synchroniser (bandeau vert). Cela peut prendre 30 s.'
              : 'Tournoi introuvable sur cet appareil.'}
          </Text>
          {isRemoteSyncEnabled() ? (
            <ActionButton label="Réessayer" onPress={() => void refresh()} variant="secondary" />
          ) : null}
          <ActionButton label="Retour accueil" onPress={() => router.replace('/')} variant="secondary" />
        </View>
      </ScreenContainer>
    );
  }

  if (!currentLevel || !stats) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Chargement du tournoi…</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleCopyDisplayLink = async () => {
    const url = displayUrl || (await getDisplayUrlAsync(roomCode));
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPlayer = () => {
    const name = playerName.trim();
    if (!name) {
      return;
    }
    if (!isLateRegistrationOpen(tournament)) {
      Alert.alert(
        'Entrées tardives closes',
        `Les inscriptions sont fermées depuis la fin du niveau ${tournament.settings.lateRegistrationUntilLevel}.`
      );
      return;
    }
    dispatch({
      type: 'ADD_PLAYER',
      player: {
        id: `player-${Date.now()}`,
        name,
        isEliminated: false,
        rebuys: 0,
        hasAddOn: false,
      },
    });
    setPlayerName('');
  };

  const handleUpdateLevel = (level: BlindLevel, field: keyof BlindLevel, raw: string) => {
    const numericFields: Array<keyof BlindLevel> = [
      'level',
      'smallBlind',
      'bigBlind',
      'ante',
      'durationMinutes',
    ];
    const value = numericFields.includes(field) ? Number(raw) || 0 : raw;
    dispatch({
      type: 'UPDATE_LEVEL',
      level: { ...level, [field]: value },
    });
  };

  const handleToggleLevelKind = () => {
    if (isBreakLevel(currentLevel)) {
      dispatch({
        type: 'UPDATE_LEVEL',
        level: {
          ...currentLevel,
          kind: 'blinds',
          smallBlind: currentLevel.smallBlind > 0 ? currentLevel.smallBlind : 100,
          bigBlind: currentLevel.bigBlind > 0 ? currentLevel.bigBlind : 200,
        },
      });
      return;
    }
    dispatch({
      type: 'UPDATE_LEVEL',
      level: {
        ...currentLevel,
        kind: 'break',
        smallBlind: 0,
        bigBlind: 0,
        ante: 0,
      },
    });
  };

  const currentBlindNumber = getBlindLevelDisplayNumber(
    tournament.levels,
    tournament.currentLevelIndex
  );
  const currentIsBreak = isBreakLevel(currentLevel);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
            <Text style={styles.roomCode}>Salle {roomCode}</Text>
          </View>
          <Pressable onPress={() => router.push(`/display/${roomCode}`)} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>Voir l’écran</Text>
          </Pressable>
        </View>

        <View style={styles.displayCard}>
          <Text style={styles.displayLabel}>Lien écran d’affichage</Text>
          <Text style={styles.displayUrl} numberOfLines={2}>
            {displayUrl}
          </Text>
          <ActionButton
            label={copied ? 'Copié !' : 'Copier le lien'}
            onPress={handleCopyDisplayLink}
            variant="secondary"
          />
        </View>

        {isRemoteSyncEnabled() && cloudSynced === false ? (
          <View style={[styles.syncCard, styles.syncCardError]}>
            <Text style={styles.syncCardTitle}>
              Sync cloud en échec — l’écran TV peut ne pas se mettre à jour
            </Text>
            <Text style={styles.syncCardHint}>
              Attendez 30 s (Render se réveille) puis appuyez sur « Forcer la sync ».
            </Text>
            <ActionButton
              label={syncing ? 'Sync…' : 'Forcer la sync'}
              disabled={syncing}
              onPress={async () => {
                setSyncing(true);
                const ok = await syncToCloud();
                setSyncing(false);
                if (!ok) {
                  Alert.alert(
                    'Sync échouée',
                    'Impossible d’envoyer le tournoi au serveur. Attendez 30 s et réessayez.'
                  );
                }
              }}
              variant="secondary"
            />
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard label="Restants" value={`${stats.active}/${stats.total}`} />
          <StatCard label="Prize pool" value={formatMoney(stats.prizePool)} />
        </View>

        <View style={styles.entryBreakdown}>
          <Text style={styles.entryBreakdownText}>
            {stats.buyIns} buy-in · {stats.rebuys} recave · {stats.addOns} add-on
          </Text>
        </View>

        <View style={styles.tabs}>
          {(['timer', 'players', 'levels', 'settings'] as TabKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
                {key === 'timer'
                  ? 'Timer'
                  : key === 'players'
                    ? 'Joueurs'
                    : key === 'levels'
                      ? 'Niveaux'
                      : 'Réglages'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'timer' ? (
          <View style={styles.panel}>
            {getLateRegistrationLabel(tournament) ? (
              <Text
                style={[
                  styles.lateRegHint,
                  !isLateRegistrationOpen(tournament) && styles.lateRegHintClosed,
                ]}
              >
                {getLateRegistrationLabel(tournament)}
              </Text>
            ) : null}
            <Text style={styles.levelTitle}>
              {currentIsBreak
                ? 'Pause'
                : currentBlindNumber
                  ? `Niveau ${currentBlindNumber}`
                  : 'Niveau'}
            </Text>
            {currentIsBreak ? (
              <Text style={styles.breakTitle}>PAUSE TOURNOI</Text>
            ) : (
              <Text style={styles.blinds}>
                {formatBlinds(currentLevel.smallBlind, currentLevel.bigBlind)}
                {currentLevel.ante > 0 ? ` · Ante ${formatChips(currentLevel.ante)}` : ''}
              </Text>
            )}
            <Text style={styles.levelDuration}>{formatLevelDurationLabel(currentLevel)}</Text>
            <Text style={styles.timer}>{formatTime(liveRemainingSeconds)}</Text>
            {nextLevel ? (
              <Text style={styles.nextLevel}>
                Suivant : {formatNextLevelPreview(nextLevel)}
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <ActionButton
                label={tournament.timerStatus === 'running' ? 'Pause timer' : 'Lancer timer'}
                onPress={() =>
                  dispatch({
                    type: tournament.timerStatus === 'running' ? 'PAUSE' : 'PLAY',
                  })
                }
              />
              <ActionButton
                label="Niv. +"
                onPress={() => dispatch({ type: 'NEXT_LEVEL' })}
                variant="secondary"
              />
              <ActionButton
                label="Niv. -"
                onPress={() => dispatch({ type: 'PREVIOUS_LEVEL' })}
                variant="secondary"
              />
            </View>

            <View style={styles.buttonRow}>
              <ActionButton
                label="- 30 s"
                onPress={() => dispatch({ type: 'ADJUST_TIME', deltaSeconds: -30 })}
                variant="secondary"
              />
              <ActionButton
                label="+ 30 s"
                onPress={() => dispatch({ type: 'ADJUST_TIME', deltaSeconds: 30 })}
                variant="secondary"
              />
              <ActionButton
                label="Reset"
                onPress={() => dispatch({ type: 'RESET_LEVEL_TIMER' })}
                variant="secondary"
              />
            </View>

            <Text style={styles.quickEditTitle}>
              {currentIsBreak ? 'Modifier la pause en cours' : 'Modifier le niveau en cours'}
            </Text>
            <ActionButton
              label={currentIsBreak ? 'Repasser en niveau blinds' : 'Transformer en pause'}
              onPress={handleToggleLevelKind}
              variant="secondary"
            />
            <View style={styles.levelFields}>
              {currentIsBreak ? (
                <LevelField
                  label="Durée pause (min)"
                  value={String(currentLevel.durationMinutes)}
                  onChange={(value) => handleUpdateLevel(currentLevel, 'durationMinutes', value)}
                />
              ) : (
                <>
                  <LevelField
                    label="SB"
                    value={String(currentLevel.smallBlind)}
                    onChange={(value) => handleUpdateLevel(currentLevel, 'smallBlind', value)}
                  />
                  <LevelField
                    label="BB"
                    value={String(currentLevel.bigBlind)}
                    onChange={(value) => handleUpdateLevel(currentLevel, 'bigBlind', value)}
                  />
                  <LevelField
                    label="Ante"
                    value={String(currentLevel.ante)}
                    onChange={(value) => handleUpdateLevel(currentLevel, 'ante', value)}
                  />
                  <LevelField
                    label="Durée (min)"
                    value={String(currentLevel.durationMinutes)}
                    onChange={(value) => handleUpdateLevel(currentLevel, 'durationMinutes', value)}
                  />
                </>
              )}
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Stack moyen" value={formatChips(stats.avgStack)} />
              <StatCard label="Jetons en jeu" value={formatChips(stats.totalChips)} />
            </View>
          </View>
        ) : null}

        {tab === 'players' ? (
          <View style={styles.panel}>
            <SectionTitle>Joueurs inscrits</SectionTitle>
            <View style={styles.inlineForm}>
              <TextInput
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Nom du joueur"
                placeholderTextColor={pokerTheme.textMuted}
                style={[styles.input, styles.flexInput]}
              />
              <ActionButton label="Ajouter" onPress={handleAddPlayer} />
            </View>

            {tournament.players.length === 0 ? (
              <Text style={styles.emptyText}>Aucun joueur pour l’instant.</Text>
            ) : (
              tournament.players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  tournament={tournament}
                  dispatch={dispatch}
                />
              ))
            )}
          </View>
        ) : null}

        {tab === 'levels' ? (
          <View style={styles.panel}>
            <SectionTitle>Structure des niveaux</SectionTitle>
            <Text style={styles.settingsHint}>
              Modifiable avant et pendant le tournoi. L’écran salle se met à jour en direct.
            </Text>
            <LevelSetupForm
              levels={tournament.levels}
              currentLevelIndex={tournament.currentLevelIndex}
              onChange={(levels) => dispatch({ type: 'SET_LEVELS', levels })}
            />
          </View>
        ) : null}

        {tab === 'settings' ? (
          <View style={styles.panel}>
            <SectionTitle>Paramètres du tournoi</SectionTitle>
            <SettingField
              label="Nom"
              value={tournament.name}
              onChange={(value) => dispatch({ type: 'SET_NAME', name: value })}
            />

            <Text style={styles.settingsGroupTitle}>Buy-in, recave et add-on</Text>
            {isEntryEditable(tournament) ? (
              <>
                <Text style={styles.settingsHint}>
                  Modifiable tant qu’aucun joueur n’est inscrit.
                </Text>
                <EntrySetupForm
                  entry={tournament.entry}
                  onChange={(entry) => dispatch({ type: 'SET_ENTRY', entry })}
                />
              </>
            ) : (
              <>
                <Text style={styles.settingsHint}>
                  Structure verrouillée dès qu’un joueur est inscrit.
                </Text>
                <EntrySetupSummary entry={tournament.entry} />
              </>
            )}

            <Text style={styles.settingsGroupTitle}>Prize pool et entrées tardives</Text>
            <PayoutSetupForm
              settings={tournament.settings}
              prizePoolPreview={getPrizePool(tournament)}
              maxBlindLevel={getMaxBlindLevel(tournament.levels)}
              onChange={(settings) => dispatch({ type: 'SET_SETTINGS', settings })}
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function PlayerRow({
  player,
  tournament,
  dispatch,
}: {
  player: Player;
  tournament: Tournament;
  dispatch: ReturnType<typeof useTournamentRoom>['dispatch'];
}) {
  const rebuyAllowed = canAddRebuy(player, tournament);
  const addOnAllowed = canAddAddOn(player, tournament);
  const chips = getPlayerChips(player, tournament);

  return (
    <View style={styles.playerRow}>
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, player.isEliminated && styles.playerEliminated]}>
          {player.name}
        </Text>
        <Text style={styles.playerMeta}>
          {player.isEliminated ? 'Éliminé' : 'En jeu'} · {formatChips(chips)} jetons
        </Text>
        <Text style={styles.playerMeta}>
          Buy-in
          {player.rebuys > 0 ? ` · ${player.rebuys} recave` : ''}
          {player.hasAddOn ? ' · add-on' : ''}
        </Text>
      </View>
      <View style={styles.playerActions}>
        <Pressable
          onPress={() => dispatch({ type: 'TOGGLE_ELIMINATED', playerId: player.id })}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {player.isEliminated ? 'Revive' : 'Out'}
          </Text>
        </Pressable>
        {tournament.entry.rebuysEnabled ? (
          <Pressable
            onPress={() => dispatch({ type: 'ADD_REBUY', playerId: player.id })}
            disabled={!rebuyAllowed}
            style={[styles.smallButton, !rebuyAllowed && styles.smallButtonDisabled]}
          >
            <Text style={styles.smallButtonText}>
              Recave {formatMoney(tournament.entry.rebuyPrice)}
            </Text>
          </Pressable>
        ) : null}
        {tournament.entry.addOnEnabled ? (
          <Pressable
            onPress={() => dispatch({ type: 'ADD_ADDON', playerId: player.id })}
            disabled={!addOnAllowed}
            style={[styles.smallButton, !addOnAllowed && styles.smallButtonDisabled]}
          >
            <Text style={styles.smallButtonText}>
              {player.hasAddOn ? 'Add-on ✓' : `Add-on ${formatMoney(tournament.entry.addOnPrice)}`}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() =>
            Alert.alert('Supprimer', `Retirer ${player.name} ?`, [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: () => dispatch({ type: 'REMOVE_PLAYER', playerId: player.id }),
              },
            ])
          }
          style={[styles.smallButton, styles.smallButtonDanger]}
        >
          <Text style={styles.smallButtonText}>X</Text>
        </Pressable>
      </View>
    </View>
  );
}

function LevelField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.levelField}>
      <Text style={styles.levelFieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        style={styles.levelFieldInput}
      />
    </View>
  );
}

function SettingField({
  label,
  value,
  onChange,
  keyboard = 'default',
  placeholder,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboard?: 'default' | 'numeric';
  placeholder?: string;
  onBlur?: () => void;
}) {
  return (
    <View style={styles.settingField}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={pokerTheme.textMuted}
        keyboardType={keyboard}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  loadingText: {
    color: pokerTheme.textMuted,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingHint: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  tournamentName: {
    color: pokerTheme.text,
    fontSize: 24,
    fontWeight: '800',
  },
  roomCode: {
    color: pokerTheme.gold,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  linkButton: {
    backgroundColor: pokerTheme.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  linkButtonText: {
    color: pokerTheme.text,
    fontWeight: '600',
  },
  displayCard: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  displayLabel: {
    color: pokerTheme.textMuted,
    fontSize: 13,
  },
  displayUrl: {
    color: pokerTheme.accent,
    fontSize: 14,
  },
  syncCard: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  syncCardOk: {
    borderColor: pokerTheme.gold,
    backgroundColor: pokerTheme.surfaceAlt,
  },
  syncCardError: {
    borderColor: pokerTheme.danger,
  },
  syncCardTitle: {
    color: pokerTheme.text,
    fontWeight: '700',
    fontSize: 15,
  },
  syncCardHint: {
    color: pokerTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  entryBreakdown: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  entryBreakdownText: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: pokerTheme.surface,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  tabActive: {
    backgroundColor: pokerTheme.gold,
    borderColor: pokerTheme.gold,
  },
  tabLabel: {
    color: pokerTheme.text,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#102018',
  },
  panel: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  levelTitle: {
    color: pokerTheme.gold,
    fontSize: 18,
    fontWeight: '700',
  },
  blinds: {
    color: pokerTheme.text,
    fontSize: 28,
    fontWeight: '800',
  },
  levelDuration: {
    color: pokerTheme.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  breakTitle: {
    color: pokerTheme.accent,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  quickEditTitle: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  timer: {
    color: pokerTheme.accent,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 2,
  },
  nextLevel: {
    color: pokerTheme.textMuted,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inlineForm: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  flexInput: {
    flex: 1,
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
  emptyText: {
    color: pokerTheme.textMuted,
  },
  playerRow: {
    backgroundColor: pokerTheme.background,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  playerInfo: {
    gap: 4,
  },
  playerName: {
    color: pokerTheme.text,
    fontSize: 17,
    fontWeight: '700',
  },
  playerEliminated: {
    textDecorationLine: 'line-through',
    color: pokerTheme.textMuted,
  },
  playerMeta: {
    color: pokerTheme.textMuted,
    fontSize: 13,
  },
  playerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallButton: {
    backgroundColor: pokerTheme.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonDanger: {
    backgroundColor: pokerTheme.danger,
  },
  smallButtonDisabled: {
    opacity: 0.4,
  },
  smallButtonText: {
    color: pokerTheme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  levelCard: {
    backgroundColor: pokerTheme.background,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  levelCardTitle: {
    color: pokerTheme.gold,
    fontWeight: '700',
  },
  levelFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelField: {
    width: '22%',
    minWidth: 70,
    gap: 4,
  },
  levelFieldLabel: {
    color: pokerTheme.textMuted,
    fontSize: 12,
  },
  levelFieldInput: {
    backgroundColor: pokerTheme.surface,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    borderRadius: 8,
    color: pokerTheme.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  settingField: {
    gap: 8,
  },
  settingLabel: {
    color: pokerTheme.textMuted,
    fontSize: 14,
  },
  settingsGroupTitle: {
    color: pokerTheme.gold,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  settingsHint: {
    color: pokerTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  lateRegHint: {
    color: pokerTheme.gold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  lateRegHintClosed: {
    color: pokerTheme.textMuted,
  },
});
