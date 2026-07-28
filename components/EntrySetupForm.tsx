import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { pokerTheme } from '@/constants/theme';
import { formatChips, formatMoney } from '@/lib/tournament-utils';
import { EntrySettings } from '@/types/tournament';

type EntryFieldKey =
  | 'buyInPrice'
  | 'buyInChips'
  | 'rebuyPrice'
  | 'rebuyChips'
  | 'maxRebuysPerPlayer'
  | 'addOnPrice'
  | 'addOnChips';

const entryFieldLabels: Record<EntryFieldKey, string> = {
  buyInPrice: 'Montant (€)',
  buyInChips: 'Jetons',
  rebuyPrice: 'Montant (€)',
  rebuyChips: 'Jetons',
  maxRebuysPerPlayer: 'Max recaves / joueur (0 = illimité)',
  addOnPrice: 'Montant (€)',
  addOnChips: 'Jetons',
};

type EntrySetupFormProps = {
  entry: EntrySettings;
  onChange: (entry: EntrySettings) => void;
  readOnly?: boolean;
};

export function EntrySetupForm({ entry, onChange, readOnly = false }: EntrySetupFormProps) {
  const updateField = (field: keyof EntrySettings, raw: string | boolean) => {
    if (readOnly) {
      return;
    }
    const value =
      typeof raw === 'boolean'
        ? raw
        : typeof entry[field] === 'number'
          ? Number(raw) || 0
          : raw;
    onChange({ ...entry, [field]: value });
  };

  return (
    <View style={styles.container}>
      <EntrySection title="Buy-in">
        <EntryFields
          entry={entry}
          readOnly={readOnly}
          fields={['buyInPrice', 'buyInChips']}
          onChange={updateField}
        />
        <EntrySummary price={entry.buyInPrice} chips={entry.buyInChips} />
      </EntrySection>

      <EntrySection title="Recave">
        <ToggleRow
          label="Recaves autorisées"
          value={entry.rebuysEnabled}
          readOnly={readOnly}
          onChange={(value) => updateField('rebuysEnabled', value)}
        />
        {entry.rebuysEnabled ? (
          <>
            <EntryFields
              entry={entry}
              readOnly={readOnly}
              fields={['rebuyPrice', 'rebuyChips', 'maxRebuysPerPlayer']}
              onChange={updateField}
            />
            <EntrySummary price={entry.rebuyPrice} chips={entry.rebuyChips} />
          </>
        ) : null}
      </EntrySection>

      <EntrySection title="Add-on">
        <ToggleRow
          label="Add-on autorisé"
          value={entry.addOnEnabled}
          readOnly={readOnly}
          onChange={(value) => updateField('addOnEnabled', value)}
        />
        {entry.addOnEnabled ? (
          <>
            <EntryFields
              entry={entry}
              readOnly={readOnly}
              fields={['addOnPrice', 'addOnChips']}
              onChange={updateField}
            />
            <EntrySummary price={entry.addOnPrice} chips={entry.addOnChips} />
          </>
        ) : null}
      </EntrySection>
    </View>
  );
}

export function EntrySetupSummary({ entry }: { entry: EntrySettings }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Structure des entrées</Text>
      <Text style={styles.summaryLine}>
        Buy-in : {formatMoney(entry.buyInPrice)} · {formatChips(entry.buyInChips)} jetons
      </Text>
      {entry.rebuysEnabled ? (
        <Text style={styles.summaryLine}>
          Recave : {formatMoney(entry.rebuyPrice)} · {formatChips(entry.rebuyChips)} jetons
          {entry.maxRebuysPerPlayer > 0
            ? ` (max ${entry.maxRebuysPerPlayer})`
            : ' (illimité)'}
        </Text>
      ) : (
        <Text style={styles.summaryLine}>Recave : non</Text>
      )}
      {entry.addOnEnabled ? (
        <Text style={styles.summaryLine}>
          Add-on : {formatMoney(entry.addOnPrice)} · {formatChips(entry.addOnChips)} jetons
        </Text>
      ) : (
        <Text style={styles.summaryLine}>Add-on : non</Text>
      )}
    </View>
  );
}


function EntrySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EntryFields({
  entry,
  fields,
  readOnly,
  onChange,
}: {
  entry: EntrySettings;
  fields: EntryFieldKey[];
  readOnly: boolean;
  onChange: (field: keyof EntrySettings, value: string) => void;
}) {
  return (
    <View style={styles.fieldsGrid}>
      {fields.map((field) => (
        <View
          key={field}
          style={[styles.field, field === 'maxRebuysPerPlayer' && styles.fieldWide]}
        >
          <Text style={styles.fieldLabel}>{entryFieldLabels[field]}</Text>
          {readOnly ? (
            <Text style={styles.readOnlyValue}>{String(entry[field])}</Text>
          ) : (
            <TextInput
              value={String(entry[field])}
              onChangeText={(value) => onChange(field, value)}
              keyboardType="numeric"
              style={styles.input}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function EntrySummary({ price, chips }: { price: number; chips: number }) {
  return (
    <Text style={styles.inlineSummary}>
      = {formatMoney(price)} pour {formatChips(chips)} jetons
    </Text>
  );
}

function ToggleRow({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: boolean;
  readOnly: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => !readOnly && onChange(!value)}
      style={[styles.toggleRow, readOnly && styles.readOnlyRow]}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <Text style={[styles.toggleText, value && styles.toggleTextActive]}>
          {value ? 'Oui' : 'Non'}
        </Text>
      </View>
    </Pressable>
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
    color: pokerTheme.gold,
    fontSize: 17,
    fontWeight: '700',
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  field: {
    flex: 1,
    minWidth: 120,
    gap: 6,
  },
  fieldWide: {
    minWidth: '100%',
  },
  fieldLabel: {
    color: pokerTheme.textMuted,
    fontSize: 13,
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
  readOnlyValue: {
    color: pokerTheme.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
  },
  inlineSummary: {
    color: pokerTheme.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  readOnlyRow: {
    opacity: 0.85,
  },
  toggleLabel: {
    color: pokerTheme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  toggle: {
    backgroundColor: pokerTheme.background,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleActive: {
    backgroundColor: pokerTheme.gold,
    borderColor: pokerTheme.gold,
  },
  toggleText: {
    color: pokerTheme.textMuted,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#102018',
  },
  summaryCard: {
    backgroundColor: pokerTheme.background,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  summaryTitle: {
    color: pokerTheme.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLine: {
    color: pokerTheme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
