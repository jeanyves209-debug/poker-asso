import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EntrySetupForm } from '@/components/EntrySetupForm';
import { LevelSetupForm } from '@/components/LevelSetupForm';
import { ActionButton, ScreenContainer, SectionTitle } from '@/components/ui';
import { pokerTheme } from '@/constants/theme';
import { cloneDefaultLevels, isBreakLevel } from '@/lib/tournament-utils';
import { useTournament } from '@/lib/tournament-store';
import { DEFAULT_ENTRY, BlindLevel, EntrySettings } from '@/types/tournament';

function validateEntry(entry: EntrySettings): string | null {
  if (entry.buyInPrice <= 0) {
    return 'Le montant du buy-in doit être supérieur à 0.';
  }
  if (entry.buyInChips <= 0) {
    return 'Le nombre de jetons du buy-in doit être supérieur à 0.';
  }
  if (entry.rebuysEnabled) {
    if (entry.rebuyPrice <= 0) {
      return 'Le montant de la recave doit être supérieur à 0.';
    }
    if (entry.rebuyChips <= 0) {
      return 'Le nombre de jetons de la recave doit être supérieur à 0.';
    }
  }
  if (entry.addOnEnabled) {
    if (entry.addOnPrice <= 0) {
      return 'Le montant de l’add-on doit être supérieur à 0.';
    }
    if (entry.addOnChips <= 0) {
      return 'Le nombre de jetons de l’add-on doit être supérieur à 0.';
    }
  }
  return null;
}

function validateLevels(levels: BlindLevel[]): string | null {
  if (levels.length === 0) {
    return 'Ajoutez au moins un niveau.';
  }
  for (const level of levels) {
    if (level.durationMinutes <= 0) {
      return isBreakLevel(level)
        ? 'La durée de la pause doit être supérieure à 0.'
        : `Niveau ${level.level} : la durée doit être supérieure à 0.`;
    }
    if (isBreakLevel(level)) {
      continue;
    }
    if (level.smallBlind <= 0 || level.bigBlind <= 0) {
      return `Niveau ${level.level} : les blinds doivent être supérieures à 0.`;
    }
  }
  return null;
}

export default function CreateTournamentScreen() {
  const { createNewTournament } = useTournament();
  const [name, setName] = useState('Tournoi associatif');
  const [entry, setEntry] = useState<EntrySettings>({ ...DEFAULT_ENTRY });
  const [levels, setLevels] = useState<BlindLevel[]>(cloneDefaultLevels());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Donnez un nom au tournoi.');
      return;
    }

    const entryError = validateEntry(entry);
    if (entryError) {
      setError(entryError);
      return;
    }

    const levelsError = validateLevels(levels);
    if (levelsError) {
      setError(levelsError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const tournament = await createNewTournament(name.trim(), entry, levels);
      router.replace(`/control/${tournament.roomCode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Configurer le tournoi</Text>
          <Text style={styles.subtitle}>
            Définissez les entrées, les jetons et la structure des niveaux avant le début du tournoi.
          </Text>

          <View style={styles.card}>
            <SectionTitle>Informations</SectionTitle>
            <Text style={styles.label}>Nom du tournoi</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex. Soirée poker du club"
              placeholderTextColor={pokerTheme.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <SectionTitle>Entrées et jetons</SectionTitle>
            <EntrySetupForm entry={entry} onChange={setEntry} />
          </View>

          <View style={styles.card}>
            <SectionTitle>Structure des niveaux</SectionTitle>
            <Text style={styles.hint}>
              Blinds et durée par niveau. Modifiable aussi pendant le tournoi depuis le contrôle.
            </Text>
            <LevelSetupForm levels={levels} onChange={setLevels} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <ActionButton
            label={loading ? 'Création…' : 'Créer le tournoi'}
            onPress={handleCreate}
            disabled={loading}
          />
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
  title: {
    color: pokerTheme.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: pokerTheme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    gap: 12,
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
  hint: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
