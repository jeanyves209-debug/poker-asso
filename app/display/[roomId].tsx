import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { pokerTheme } from '@/constants/theme';
import { isRemoteSyncEnabled } from '@/lib/config';
import { useTournamentRoom } from '@/lib/use-tournament-room';
import {
  getBlindLevelDisplayNumber,
  formatBlinds,
  formatChips,
  formatLevelDurationLabel,
  formatMoney,
  formatPlaceLabel,
  formatTime,
  getActivePlayers,
  getAddOnCount,
  getAverageStack,
  getBuyInCount,
  getLateRegistrationLabel,
  getPayoutBreakdown,
  getPrizePool,
  getRebuyCount,
  isBreakLevel,
  isLateRegistrationOpen,
} from '@/lib/tournament-utils';

export default function DisplayScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const roomCode = (roomId ?? '').toUpperCase();
  const { tournament } = useTournamentRoom(roomCode, { readOnly: true });
  const { width } = useWindowDimensions();

  const currentLevel = tournament?.levels[tournament.currentLevelIndex];
  const nextLevel = tournament?.levels[tournament.currentLevelIndex + 1];

  const stats = useMemo(() => {
    if (!tournament) {
      return null;
    }

    const { entry } = tournament;
    const buyIns = getBuyInCount(tournament);
    const rebuys = getRebuyCount(tournament);
    const addOns = getAddOnCount(tournament);
    const active = getActivePlayers(tournament).length;

    return {
      active,
      total: tournament.players.length,
      buyIns,
      rebuys,
      addOns,
      prizePool: getPrizePool(tournament),
      avgStack: getAverageStack(tournament),
      payouts: getPayoutBreakdown(tournament),
      lateRegistrationLabel: getLateRegistrationLabel(tournament),
      lateRegistrationOpen: isLateRegistrationOpen(tournament),
      prizeBreakdown: {
        buyIn: buyIns * entry.buyInPrice,
        rebuy: entry.rebuysEnabled ? rebuys * entry.rebuyPrice : 0,
        addOn: entry.addOnEnabled ? addOns * entry.addOnPrice : 0,
      },
    };
  }, [tournament]);

  const scale = width > 1200 ? 1.2 : width > 800 ? 1 : 0.85;

  if (!tournament || !currentLevel || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingTitle}>En attente du tournoi</Text>
          <Text style={styles.waitingCode}>Salle {roomCode || '——'}</Text>
          <Text style={styles.waitingText}>
            Ouvrez le contrôle sur le téléphone avec le code salle {roomCode || '——'}.
            {isRemoteSyncEnabled()
              ? ' Les appareils connectés à internet se synchronisent automatiquement.'
              : ' Sur le web, les deux onglets doivent être ouverts sur le même navigateur.'}
          </Text>
        </View>
      </View>
    );
  }

  const isLowTime = tournament.remainingSeconds <= 60;
  const durationLabel = formatLevelDurationLabel(currentLevel);
  const currentBlindNumber = getBlindLevelDisplayNumber(
    tournament.levels,
    tournament.currentLevelIndex
  );
  const currentIsBreak = isBreakLevel(currentLevel);
  const nextIsBreak = nextLevel ? isBreakLevel(nextLevel) : false;

  const statusLabel = (() => {
    if (tournament.timerStatus !== 'running') {
      return 'Timer en pause';
    }
    if (currentIsBreak) {
      return 'Pause en cours';
    }
    return 'En cours';
  })();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <Text style={styles.roomCode}>Salle {roomCode}</Text>
          {stats.lateRegistrationLabel ? (
            <View
              style={[
                styles.lateRegBanner,
                !stats.lateRegistrationOpen && styles.lateRegBannerClosed,
              ]}
            >
              <Text
                style={[
                  styles.lateRegText,
                  !stats.lateRegistrationOpen && styles.lateRegTextClosed,
                ]}
              >
                {stats.lateRegistrationLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.heroPanel, currentIsBreak && styles.heroPanelBreak]}>
          {currentIsBreak ? (
            <>
              <Text style={[styles.blindsLabel, { fontSize: 22 * scale }]}>Pause tournoi</Text>
              <Text style={[styles.breakHero, { fontSize: 100 * scale, lineHeight: 110 * scale }]}>
                PAUSE
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.blindsLabel, { fontSize: 22 * scale }]}>Blinds actuelles</Text>
              <Text style={[styles.blinds, { fontSize: 120 * scale, lineHeight: 130 * scale }]}>
                {formatBlinds(currentLevel.smallBlind, currentLevel.bigBlind)}
              </Text>
              {currentLevel.ante > 0 ? (
                <Text style={[styles.ante, { fontSize: 32 * scale }]}>
                  Ante {formatChips(currentLevel.ante)}
                </Text>
              ) : null}
            </>
          )}

          <View style={styles.divider} />

          {!currentIsBreak && currentBlindNumber ? (
            <Text style={[styles.levelNumber, { fontSize: 28 * scale }]}>
              NIVEAU {currentBlindNumber}
            </Text>
          ) : null}
          <Text style={[styles.levelDuration, { fontSize: 36 * scale }]}>{durationLabel}</Text>

          <Text
            style={[
              styles.timer,
              { fontSize: 140 * scale, lineHeight: 150 * scale },
              isLowTime && styles.timerWarning,
            ]}
          >
            {formatTime(tournament.remainingSeconds)}
          </Text>

          <View style={[styles.statusBadge, tournament.timerStatus === 'running' && styles.statusRunning]}>
            <Text
              style={[
                styles.statusText,
                tournament.timerStatus === 'running' && styles.statusTextRunning,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.statsColumn}>
            <View style={styles.statBlock}>
              <View style={styles.statStackedSection}>
                <Text style={styles.statLabel}>Joueurs restants</Text>
                <Text style={styles.statValueLarge}>
                  {stats.active}
                  <Text style={styles.statValueMuted}> / {stats.total}</Text>
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statStackedSection}>
                <Text style={styles.statLabel}>Stack moyen</Text>
                <Text style={styles.statValueLarge}>{formatChips(stats.avgStack)}</Text>
                <Text style={styles.statHint}>
                  {stats.active > 0
                    ? `Sur ${stats.active} joueur${stats.active > 1 ? 's' : ''} restant${stats.active > 1 ? 's' : ''}`
                    : 'Aucun joueur en jeu'}
                </Text>
              </View>
            </View>

            <View style={[styles.statBlock, styles.statBlockWide]}>
              <Text style={styles.statLabel}>Prize pool</Text>
              <Text style={styles.statValueLarge}>{formatMoney(stats.prizePool)}</Text>
              <View style={styles.prizeBreakdown}>
                <Text style={styles.prizeLine}>
                  Buy-in · {stats.buyIns} × {formatMoney(tournament.entry.buyInPrice)} ={' '}
                  {formatMoney(stats.prizeBreakdown.buyIn)}
                </Text>
                {tournament.entry.rebuysEnabled ? (
                  <Text style={styles.prizeLine}>
                    Recave · {stats.rebuys} × {formatMoney(tournament.entry.rebuyPrice)} ={' '}
                    {formatMoney(stats.prizeBreakdown.rebuy)}
                  </Text>
                ) : null}
                {tournament.entry.addOnEnabled ? (
                  <Text style={styles.prizeLine}>
                    Add-on · {stats.addOns} × {formatMoney(tournament.entry.addOnPrice)} ={' '}
                    {formatMoney(stats.prizeBreakdown.addOn)}
                  </Text>
                ) : null}
              </View>

              {stats.payouts.length > 0 ? (
                <View style={styles.payoutList}>
                  {stats.payouts.map((payout) => (
                    <View key={payout.place} style={styles.payoutRow}>
                      <Text style={styles.payoutPlace}>{formatPlaceLabel(payout.place)}</Text>
                      <Text style={styles.payoutPercent}>{payout.percent}%</Text>
                      <Text style={styles.payoutAmount}>{formatMoney(payout.amount)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {nextLevel ? (
            <View style={[styles.nextLevelPanel, nextIsBreak && styles.nextLevelPanelBreak]}>
              <Text style={styles.nextLevelLabel}>
                {nextIsBreak ? 'Prochaine pause' : 'Prochain niveau'}
              </Text>
              {nextIsBreak ? (
                <>
                  <Text style={styles.nextLevelBreak}>PAUSE</Text>
                  <Text style={styles.nextLevelMeta}>
                    {nextLevel.durationMinutes} min
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextLevelBlinds}>
                    {formatBlinds(nextLevel.smallBlind, nextLevel.bigBlind)}
                  </Text>
                  {nextLevel.ante > 0 ? (
                    <Text style={styles.nextLevelAnte}>
                      Ante {formatChips(nextLevel.ante)}
                    </Text>
                  ) : null}
                  <Text style={styles.nextLevelMeta}>
                    Niveau {nextLevel.level} · {nextLevel.durationMinutes} min
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pokerTheme.background,
  },
  content: {
    padding: 32,
    minHeight: '100%',
    gap: 20,
  },
  topBar: {
    gap: 4,
  },
  lateRegBanner: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: pokerTheme.surface,
    borderWidth: 1,
    borderColor: pokerTheme.goldMuted,
  },
  lateRegBannerClosed: {
    borderColor: pokerTheme.border,
    backgroundColor: pokerTheme.surfaceAlt,
  },
  lateRegText: {
    color: pokerTheme.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  lateRegTextClosed: {
    color: pokerTheme.textMuted,
  },
  tournamentName: {
    color: pokerTheme.textMuted,
    fontSize: 22,
    fontWeight: '600',
  },
  roomCode: {
    color: pokerTheme.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  heroPanel: {
    backgroundColor: pokerTheme.felt,
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: pokerTheme.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 420,
  },
  heroPanelBreak: {
    borderColor: pokerTheme.accent,
  },
  breakHero: {
    color: pokerTheme.accent,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  blindsLabel: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  blinds: {
    color: pokerTheme.text,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
  },
  ante: {
    color: pokerTheme.gold,
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    width: '50%',
    height: 2,
    backgroundColor: pokerTheme.border,
    marginVertical: 20,
  },
  levelNumber: {
    color: pokerTheme.gold,
    fontWeight: '800',
    letterSpacing: 3,
  },
  levelDuration: {
    color: pokerTheme.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  timer: {
    color: pokerTheme.accent,
    fontWeight: '900',
    letterSpacing: 6,
    marginVertical: 8,
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: pokerTheme.danger,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: pokerTheme.surfaceAlt,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  statusRunning: {
    backgroundColor: pokerTheme.gold,
    borderColor: pokerTheme.gold,
  },
  statusText: {
    color: pokerTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statusTextRunning: {
    color: '#102018',
  },
  nextLevelPanel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: pokerTheme.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: pokerTheme.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextLevelPanelBreak: {
    borderColor: pokerTheme.accent,
  },
  nextLevelBreak: {
    color: pokerTheme.accent,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
  },
  nextLevelLabel: {
    color: pokerTheme.textMuted,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  nextLevelBlinds: {
    color: pokerTheme.gold,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 2,
  },
  nextLevelAnte: {
    color: pokerTheme.textMuted,
    fontSize: 20,
    fontWeight: '600',
  },
  nextLevelMeta: {
    color: pokerTheme.textMuted,
    fontSize: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'stretch',
  },
  statsColumn: {
    flex: 2,
    minWidth: 320,
    gap: 16,
  },
  statBlock: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    gap: 6,
  },
  statStackedSection: {
    gap: 6,
  },
  statDivider: {
    height: 1,
    backgroundColor: pokerTheme.border,
    marginVertical: 8,
  },
  statBlockWide: {
    flex: 1,
  },
  statLabel: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValueLarge: {
    color: pokerTheme.text,
    fontSize: 40,
    fontWeight: '900',
  },
  statValueMuted: {
    color: pokerTheme.textMuted,
    fontSize: 28,
    fontWeight: '700',
  },
  statHint: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  prizeBreakdown: {
    marginTop: 8,
    gap: 4,
  },
  prizeLine: {
    color: pokerTheme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  payoutList: {
    marginTop: 12,
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: pokerTheme.border,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payoutPlace: {
    color: pokerTheme.text,
    fontWeight: '700',
    width: 40,
  },
  payoutPercent: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
    width: 48,
  },
  payoutAmount: {
    color: pokerTheme.gold,
    fontWeight: '800',
    fontSize: 18,
    flex: 1,
    textAlign: 'right',
  },
  waitingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  waitingTitle: {
    color: pokerTheme.text,
    fontSize: 32,
    fontWeight: '800',
  },
  waitingCode: {
    color: pokerTheme.gold,
    fontSize: 28,
    fontWeight: '800',
  },
  waitingText: {
    color: pokerTheme.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 520,
  },
});
