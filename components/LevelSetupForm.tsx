import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createBreakLevel } from '@/lib/default-levels';
import {
  formatLevelSummary,
  isBreakLevel,
  normalizeLevel,
  reindexBlindLevels,
} from '@/lib/tournament-utils';
import { pokerTheme } from '@/constants/theme';
import { BlindLevel, LevelKind } from '@/types/tournament';

type LevelSetupFormProps = {
  levels: BlindLevel[];
  onChange: (levels: BlindLevel[]) => void;
  currentLevelIndex?: number;
  readOnly?: boolean;
};

export function LevelSetupForm({
  levels,
  onChange,
  currentLevelIndex,
  readOnly = false,
}: LevelSetupFormProps) {
  const emitLevels = (next: BlindLevel[]) => {
    onChange(reindexBlindLevels(next));
  };

  const updateLevel = (levelId: string, field: keyof BlindLevel, raw: string) => {
    if (readOnly) {
      return;
    }
    const numericFields: Array<keyof BlindLevel> = [
      'level',
      'smallBlind',
      'bigBlind',
      'ante',
      'durationMinutes',
    ];
    const value = numericFields.includes(field) ? Number(raw) || 0 : raw;
    emitLevels(
      levels.map((level) =>
        level.id === levelId ? normalizeLevel({ ...level, [field]: value }) : level
      )
    );
  };

  const setLevelKind = (levelId: string, kind: LevelKind) => {
    if (readOnly) {
      return;
    }
    emitLevels(
      levels.map((level) => {
        if (level.id !== levelId) {
          return level;
        }
        if (kind === 'break') {
          return normalizeLevel({
            ...level,
            kind: 'break',
            smallBlind: 0,
            bigBlind: 0,
            ante: 0,
          });
        }
        return normalizeLevel({
          ...level,
          kind: 'blinds',
          smallBlind: level.smallBlind > 0 ? level.smallBlind : 100,
          bigBlind: level.bigBlind > 0 ? level.bigBlind : 200,
        });
      })
    );
  };

  const addLevel = () => {
    if (readOnly) {
      return;
    }
    const previous = [...levels].reverse().find((level) => !isBreakLevel(level));
    const newLevel: BlindLevel = normalizeLevel({
      id: `level-${Date.now()}`,
      level: 0,
      kind: 'blinds',
      smallBlind: previous ? previous.smallBlind * 2 : 25,
      bigBlind: previous ? previous.bigBlind * 2 : 50,
      ante: previous?.ante ?? 0,
      durationMinutes: previous?.durationMinutes ?? 20,
    });
    emitLevels([...levels, newLevel]);
  };

  const addBreak = () => {
    if (readOnly) {
      return;
    }
    emitLevels([...levels, createBreakLevel(15)]);
  };

  const removeLevel = (levelId: string) => {
    if (readOnly || levels.length <= 1) {
      return;
    }
    emitLevels(levels.filter((level) => level.id !== levelId));
  };

  return (
    <View style={styles.container}>
      {levels.map((level, index) => {
        const isCurrent = currentLevelIndex === index;
        const isBreak = isBreakLevel(level);
        return (
          <View
            key={level.id}
            style={[
              styles.levelCard,
              isCurrent && styles.levelCardCurrent,
              isBreak && styles.levelCardBreak,
            ]}
          >
            <View style={styles.levelHeader}>
              <Text style={[styles.levelTitle, isCurrent && styles.levelTitleCurrent]}>
                {isBreak ? 'Pause' : `Niveau ${level.level}`}
                {isCurrent ? ' · en cours' : ''}
              </Text>
              {!readOnly && levels.length > 1 ? (
                <Pressable onPress={() => removeLevel(level.id)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Supprimer</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.levelPreview}>{formatLevelSummary(level)}</Text>

            {!readOnly ? (
              <View style={styles.kindToggleRow}>
                <KindToggle
                  label="Blinds"
                  active={!isBreak}
                  onPress={() => setLevelKind(level.id, 'blinds')}
                />
                <KindToggle
                  label="Pause"
                  active={isBreak}
                  onPress={() => setLevelKind(level.id, 'break')}
                />
              </View>
            ) : null}

            {isBreak ? (
              <View style={styles.fieldsGrid}>
                <LevelField
                  label="Durée pause (min)"
                  value={String(level.durationMinutes)}
                  readOnly={readOnly}
                  wide
                  onChange={(value) => updateLevel(level.id, 'durationMinutes', value)}
                />
              </View>
            ) : (
              <View style={styles.fieldsGrid}>
                <LevelField
                  label="SB"
                  value={String(level.smallBlind)}
                  readOnly={readOnly}
                  onChange={(value) => updateLevel(level.id, 'smallBlind', value)}
                />
                <LevelField
                  label="BB"
                  value={String(level.bigBlind)}
                  readOnly={readOnly}
                  onChange={(value) => updateLevel(level.id, 'bigBlind', value)}
                />
                <LevelField
                  label="Ante"
                  value={String(level.ante)}
                  readOnly={readOnly}
                  onChange={(value) => updateLevel(level.id, 'ante', value)}
                />
                <LevelField
                  label="Durée (min)"
                  value={String(level.durationMinutes)}
                  readOnly={readOnly}
                  onChange={(value) => updateLevel(level.id, 'durationMinutes', value)}
                />
              </View>
            )}
          </View>
        );
      })}

      {!readOnly ? (
        <View style={styles.addRow}>
          <Pressable onPress={addLevel} style={[styles.addButton, styles.addButtonHalf]}>
            <Text style={styles.addButtonText}>+ Niveau blinds</Text>
          </Pressable>
          <Pressable onPress={addBreak} style={[styles.addButton, styles.addButtonHalf]}>
            <Text style={styles.addButtonText}>+ Pause</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function KindToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.kindToggle, active && styles.kindToggleActive]}
    >
      <Text style={[styles.kindToggleText, active && styles.kindToggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LevelField({
  label,
  value,
  readOnly,
  wide = false,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={[styles.field, wide && styles.fieldWide]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {readOnly ? (
        <Text style={styles.readOnlyValue}>{value}</Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          style={styles.input}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  levelCard: {
    backgroundColor: pokerTheme.background,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  levelCardCurrent: {
    borderColor: pokerTheme.gold,
    borderWidth: 2,
  },
  levelCardBreak: {
    borderColor: pokerTheme.accent,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  levelTitle: {
    color: pokerTheme.gold,
    fontWeight: '700',
    fontSize: 16,
  },
  levelTitleCurrent: {
    color: pokerTheme.accent,
  },
  levelPreview: {
    color: pokerTheme.textMuted,
    fontSize: 14,
  },
  kindToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kindToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    alignItems: 'center',
    backgroundColor: pokerTheme.surface,
  },
  kindToggleActive: {
    backgroundColor: pokerTheme.gold,
    borderColor: pokerTheme.gold,
  },
  kindToggleText: {
    color: pokerTheme.text,
    fontWeight: '700',
  },
  kindToggleTextActive: {
    color: '#102018',
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  field: {
    flex: 1,
    minWidth: 72,
    gap: 4,
  },
  fieldWide: {
    minWidth: '100%',
  },
  fieldLabel: {
    color: pokerTheme.textMuted,
    fontSize: 12,
  },
  input: {
    backgroundColor: pokerTheme.surface,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    borderRadius: 8,
    color: pokerTheme.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  readOnlyValue: {
    color: pokerTheme.text,
    fontWeight: '600',
    paddingVertical: 8,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: pokerTheme.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    borderWidth: 1,
    borderColor: pokerTheme.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonHalf: {
    flex: 1,
  },
  addButtonText: {
    color: pokerTheme.gold,
    fontWeight: '700',
  },
});
