import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { pokerTheme } from '@/constants/theme';
import {
  formatMoney,
  formatPlaceLabel,
  getPayoutPercentTotal,
} from '@/lib/tournament-utils';
import { PayoutPlace, TournamentSettings } from '@/types/tournament';

type PayoutSetupFormProps = {
  settings: TournamentSettings;
  prizePoolPreview: number;
  maxBlindLevel: number;
  onChange: (settings: TournamentSettings) => void;
};

export function PayoutSetupForm({
  settings,
  prizePoolPreview,
  maxBlindLevel,
  onChange,
}: PayoutSetupFormProps) {
  const totalPercent = getPayoutPercentTotal(settings.payouts);
  const sortedPayouts = [...settings.payouts].sort((a, b) => a.place - b.place);

  const updateLateRegistration = (raw: string) => {
    const value = Math.max(0, Math.min(Number(raw) || 0, maxBlindLevel));
    onChange({ ...settings, lateRegistrationUntilLevel: value });
  };

  const updatePayout = (place: number, percent: number) => {
    onChange({
      ...settings,
      payouts: settings.payouts.map((payout) =>
        payout.place === place ? { ...payout, percent } : payout
      ),
    });
  };

  const addPlace = () => {
    const nextPlace =
      settings.payouts.reduce((max, payout) => Math.max(max, payout.place), 0) + 1;
    onChange({
      ...settings,
      payouts: [...settings.payouts, { place: nextPlace, percent: 0 }],
    });
  };

  const removePlace = (place: number) => {
    if (settings.payouts.length <= 1) {
      return;
    }
    onChange({
      ...settings,
      payouts: settings.payouts.filter((payout) => payout.place !== place),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entrées tardives</Text>
        <Text style={styles.hint}>
          0 = pas de limite. Sinon, les entrées restent ouvertes jusqu’à la fin du niveau choisi.
        </Text>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Fin des entrées tardives</Text>
          <TextInput
            value={String(settings.lateRegistrationUntilLevel)}
            onChangeText={updateLateRegistration}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={pokerTheme.textMuted}
            style={styles.input}
          />
        </View>
        <Text style={styles.meta}>
          {settings.lateRegistrationUntilLevel <= 0
            ? 'Aucune limite d’entrées tardives'
            : `Fermeture à la fin du niveau ${settings.lateRegistrationUntilLevel}`}
          {maxBlindLevel > 0 ? ` · ${maxBlindLevel} niveau(x) blinds` : ''}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Répartition du prize pool</Text>
        <Text style={styles.hint}>
          Définissez le pourcentage pour chaque place payée. L’écran salle affiche les montants
          calculés.
        </Text>

        {sortedPayouts.map((payout) => (
          <View key={payout.place} style={styles.payoutRow}>
            <Text style={styles.placeLabel}>{formatPlaceLabel(payout.place)}</Text>
            <View style={styles.percentField}>
              <TextInput
                value={String(payout.percent)}
                onChangeText={(raw) =>
                  updatePayout(payout.place, Math.max(0, Number(raw) || 0))
                }
                keyboardType="number-pad"
                style={styles.percentInput}
              />
              <Text style={styles.percentSuffix}>%</Text>
            </View>
            <Text style={styles.amountPreview}>
              {formatMoney(Math.round((prizePoolPreview * payout.percent) / 100))}
            </Text>
            <Pressable
              onPress={() => removePlace(payout.place)}
              style={styles.removeButton}
              disabled={settings.payouts.length <= 1}
            >
              <Text
                style={[
                  styles.removeLabel,
                  settings.payouts.length <= 1 && styles.removeLabelDisabled,
                ]}
              >
                Retirer
              </Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addPlace} style={styles.addButton}>
          <Text style={styles.addLabel}>+ Ajouter une place payée</Text>
        </Pressable>

        <Text
          style={[
            styles.totalLine,
            totalPercent !== 100 && styles.totalLineWarning,
          ]}
        >
          Total : {totalPercent}% {totalPercent === 100 ? '' : '· idéalement 100%'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: pokerTheme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: pokerTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldRow: {
    gap: 6,
  },
  fieldLabel: {
    color: pokerTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: pokerTheme.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    color: pokerTheme.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  meta: {
    color: pokerTheme.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: pokerTheme.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placeLabel: {
    color: pokerTheme.text,
    fontWeight: '700',
    width: 36,
  },
  percentField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  percentInput: {
    flex: 1,
    backgroundColor: pokerTheme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    color: pokerTheme.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'right',
  },
  percentSuffix: {
    color: pokerTheme.textMuted,
    fontWeight: '600',
  },
  amountPreview: {
    color: pokerTheme.gold,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'right',
  },
  removeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  removeLabel: {
    color: pokerTheme.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  removeLabelDisabled: {
    opacity: 0.35,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  addLabel: {
    color: pokerTheme.gold,
    fontWeight: '700',
  },
  totalLine: {
    color: pokerTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  totalLineWarning: {
    color: pokerTheme.danger,
  },
});
