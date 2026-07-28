import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { pokerTheme } from '@/constants/theme';
import { isRemoteSyncEnabled } from '@/lib/config';
import { setDisplaySyncOverride } from '@/lib/sync-url';
import { useFullscreen } from '@/lib/use-fullscreen';
import { getControlUrl } from '@/lib/tournament-sync';
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
  const { roomId, sync } = useLocalSearchParams<{ roomId: string; sync?: string | string[] }>();
  const roomCode = (roomId ?? '').toUpperCase();
  const { tournament, isLoading } = useTournamentRoom(roomCode, { readOnly: true });
  const { width, height } = useWindowDimensions();
  const { isFullscreen, toggle, supported } = useFullscreen();

  useEffect(() => {
    const raw = Array.isArray(sync) ? sync[0] : sync;
    if (raw) {
      setDisplaySyncOverride(decodeURIComponent(raw));
    }
  }, [sync]);

  const isLandscape = width > height;
  const fitScale = Math.min(width / 1000, height / (isLandscape ? 560 : 820), 1.35);
  const scale = Math.max(0.75, fitScale);
  const heroScale = scale * 1.12;

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingTitle}>Chargement…</Text>
          <Text style={styles.waitingCode}>Salle {roomCode || '——'}</Text>
        </View>
      </View>
    );
  }

  if (!tournament || !currentLevel || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.waitingCard}>
          <Text style={styles.waitingTitle}>En attente du tournoi</Text>
          <Text style={styles.waitingCode}>Salle {roomCode || '——'}</Text>
          <Text style={styles.waitingText}>
            {isRemoteSyncEnabled() || sync
              ? `Le tournoi n’est pas encore synchronisé. Sur le téléphone, ouvrez le contrôle :\n${getControlUrl(roomCode)}`
              : `Ouvrez le contrôle sur le même navigateur :\n${getControlUrl(roomCode)}`}
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
      <View style={[styles.page, isLandscape ? styles.pageLandscape : styles.pagePortrait]}>
        <View style={styles.headerRow}>
          <View style={styles.topBar}>
            <Text style={[styles.tournamentName, { fontSize: 18 * scale }]}>
              {tournament.name}
            </Text>
            <Text style={[styles.roomCode, { fontSize: 14 * scale }]}>Salle {roomCode}</Text>
            {stats.lateRegistrationLabel ? (
              <Text
                style={[
                  styles.lateRegInline,
                  { fontSize: 12 * scale },
                  !stats.lateRegistrationOpen && styles.lateRegInlineClosed,
                ]}
                numberOfLines={1}
              >
                {stats.lateRegistrationLabel}
              </Text>
            ) : null}
          </View>

          {supported ? (
            <Pressable onPress={toggle} style={styles.fullscreenButton}>
              <Text style={styles.fullscreenLabel}>
                {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.main, isLandscape && styles.mainLandscape]}>
          <View
            style={[
              styles.heroPanel,
              isLandscape && styles.heroPanelLandscape,
              currentIsBreak && styles.heroPanelBreak,
            ]}
          >
            {currentIsBreak ? (
              <>
                <Text style={[styles.blindsLabel, { fontSize: 22 * scale }]}>Pause tournoi</Text>
                <Text style={[styles.breakHero, { fontSize: 96 * heroScale, lineHeight: 104 * heroScale }]}>
                  PAUSE
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.blindsLabel, { fontSize: 22 * scale }]}>Blinds actuelles</Text>
                <Text style={[styles.blinds, { fontSize: 120 * heroScale, lineHeight: 128 * heroScale }]}>
                  {formatBlinds(currentLevel.smallBlind, currentLevel.bigBlind)}
                </Text>
                {currentLevel.ante > 0 ? (
                  <Text style={[styles.ante, { fontSize: 30 * scale }]}>
                    Ante {formatChips(currentLevel.ante)}
                  </Text>
                ) : null}
              </>
            )}

            {!currentIsBreak && currentBlindNumber ? (
              <Text style={[styles.levelNumber, { fontSize: 32 * heroScale }]}>
                NIVEAU {currentBlindNumber}
              </Text>
            ) : null}
            <Text style={[styles.levelDuration, { fontSize: 26 * scale }]}>{durationLabel}</Text>

            <Text
              style={[
                styles.timer,
                { fontSize: 144 * heroScale, lineHeight: 152 * heroScale },
                isLowTime && styles.timerWarning,
              ]}
            >
              {formatTime(tournament.remainingSeconds)}
            </Text>

            <View
              style={[styles.statusBadge, tournament.timerStatus === 'running' && styles.statusRunning]}
            >
              <Text
                style={[
                  styles.statusText,
                  { fontSize: 14 * scale },
                  tournament.timerStatus === 'running' && styles.statusTextRunning,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={[styles.sidePanel, isLandscape && styles.sidePanelLandscape]}>
            <View style={[styles.statBlock, styles.statBlockCompact]}>
              <Text style={[styles.statLabel, { fontSize: 11 * scale }]}>Joueurs restants</Text>
              <Text style={[styles.statValueLarge, { fontSize: 32 * scale }]}>
                {stats.active}
                <Text style={[styles.statValueMuted, { fontSize: 22 * scale }]}>
                  {' '}
                  / {stats.total}
                </Text>
              </Text>
              <Text style={[styles.statLabel, { fontSize: 11 * scale, marginTop: 8 }]}>
                Stack moyen
              </Text>
              <Text style={[styles.statValueLarge, { fontSize: 28 * scale }]}>
                {formatChips(stats.avgStack)}
              </Text>
            </View>

            <View style={[styles.statBlock, styles.statBlockCompact, styles.statBlockFlex]}>
              <Text style={[styles.statLabel, { fontSize: 11 * scale }]}>Prize pool</Text>
              <Text style={[styles.statValueLarge, { fontSize: 30 * scale }]}>
                {formatMoney(stats.prizePool)}
              </Text>
              <Text style={[styles.prizeLine, { fontSize: 12 * scale }]}>
                Buy-in {stats.buyIns} · Recave {stats.rebuys} · Add-on {stats.addOns}
              </Text>
              {stats.payouts.length > 0 ? (
                <View style={styles.payoutList}>
                  {stats.payouts.map((payout) => (
                    <View key={payout.place} style={styles.payoutRow}>
                      <Text style={[styles.payoutPlace, { fontSize: 13 * scale }]}>
                        {formatPlaceLabel(payout.place)}
                      </Text>
                      <Text style={[styles.payoutPercent, { fontSize: 12 * scale }]}>
                        {payout.percent}%
                      </Text>
                      <Text style={[styles.payoutAmount, { fontSize: 14 * scale }]}>
                        {formatMoney(payout.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {nextLevel ? (
              <View
                style={[
                  styles.statBlock,
                  styles.statBlockCompact,
                  nextIsBreak && styles.nextLevelPanelBreak,
                ]}
              >
                <Text style={[styles.statLabel, { fontSize: 11 * scale }]}>
                  {nextIsBreak ? 'Prochaine pause' : 'Prochain niveau'}
                </Text>
                {nextIsBreak ? (
                  <>
                    <Text style={[styles.nextLevelBreak, { fontSize: 32 * scale }]}>PAUSE</Text>
                    <Text style={[styles.nextLevelMeta, { fontSize: 14 * scale }]}>
                      {nextLevel.durationMinutes} min
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.nextLevelBlinds, { fontSize: 36 * scale }]}>
                      {formatBlinds(nextLevel.smallBlind, nextLevel.bigBlind)}
                    </Text>
                    {nextLevel.ante > 0 ? (
                      <Text style={[styles.nextLevelMeta, { fontSize: 13 * scale }]}>
                        Ante {formatChips(nextLevel.ante)}
                      </Text>
                    ) : null}
                    <Text style={[styles.nextLevelMeta, { fontSize: 13 * scale }]}>
                      Niv. {nextLevel.level} · {nextLevel.durationMinutes} min
                    </Text>
                  </>
                )}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pokerTheme.background,
  },
  page: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  pageLandscape: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pagePortrait: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topBar: {
    flex: 1,
    gap: 2,
  },
  fullscreenButton: {
    backgroundColor: pokerTheme.surfaceAlt,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fullscreenLabel: {
    color: pokerTheme.gold,
    fontWeight: '700',
    fontSize: 14,
  },
  lateRegInline: {
    color: pokerTheme.gold,
    fontWeight: '600',
    marginTop: 4,
  },
  lateRegInlineClosed: {
    color: pokerTheme.textMuted,
  },
  tournamentName: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
  },
  roomCode: {
    color: pokerTheme.gold,
    fontWeight: '700',
  },
  main: {
    flex: 1,
    gap: 12,
  },
  mainLandscape: {
    flexDirection: 'row',
    gap: 14,
  },
  heroPanel: {
    flex: 1,
    backgroundColor: pokerTheme.felt,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: pokerTheme.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroPanelLandscape: {
    flex: 1.4,
  },
  heroPanelBreak: {
    borderColor: pokerTheme.accent,
  },
  breakHero: {
    color: pokerTheme.accent,
    fontWeight: '900',
    letterSpacing: 6,
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
  },
  levelNumber: {
    color: pokerTheme.gold,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  levelDuration: {
    color: pokerTheme.text,
    fontWeight: '700',
  },
  timer: {
    color: pokerTheme.accent,
    fontWeight: '900',
    letterSpacing: 4,
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: pokerTheme.danger,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
    fontWeight: '700',
  },
  statusTextRunning: {
    color: '#102018',
  },
  sidePanel: {
    gap: 10,
  },
  sidePanelLandscape: {
    flex: 1,
    minWidth: 260,
    maxWidth: 420,
  },
  statBlock: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    gap: 4,
  },
  statBlockCompact: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statBlockFlex: {
    flex: 1,
  },
  statLabel: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValueLarge: {
    color: pokerTheme.text,
    fontWeight: '900',
  },
  statValueMuted: {
    color: pokerTheme.textMuted,
    fontWeight: '700',
  },
  prizeLine: {
    color: pokerTheme.textMuted,
    marginTop: 4,
  },
  payoutList: {
    marginTop: 8,
    gap: 4,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutPlace: {
    color: pokerTheme.text,
    fontWeight: '700',
    width: 36,
  },
  payoutPercent: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
    width: 40,
  },
  payoutAmount: {
    color: pokerTheme.gold,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  nextLevelPanelBreak: {
    borderColor: pokerTheme.accent,
  },
  nextLevelBreak: {
    color: pokerTheme.accent,
    fontWeight: '900',
    letterSpacing: 3,
  },
  nextLevelBlinds: {
    color: pokerTheme.gold,
    fontWeight: '900',
    letterSpacing: 1,
  },
  nextLevelMeta: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
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
