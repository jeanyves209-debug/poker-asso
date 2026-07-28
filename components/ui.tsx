import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pokerTheme } from '@/constants/theme';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  primary: {
    backgroundColor: pokerTheme.gold,
  },
  secondary: {
    backgroundColor: pokerTheme.surfaceAlt,
    borderWidth: 1,
    borderColor: pokerTheme.border,
  },
  danger: {
    backgroundColor: pokerTheme.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: '#102018',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryLabel: {
    color: pokerTheme.text,
  },
});

export function ScreenContainer({ children }: { children: React.ReactNode }) {
  return <View style={screenStyles.container}>{children}</View>;
}

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pokerTheme.background,
  },
});

export function SectionTitle({ children }: { children: string }) {
  return <Text style={sectionStyles.title}>{children}</Text>;
}

const sectionStyles = StyleSheet.create({
  title: {
    color: pokerTheme.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
});

export function StatCard({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <View style={[statStyles.card, large && statStyles.largeCard]}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, large && statStyles.largeValue]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: pokerTheme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: pokerTheme.border,
    minWidth: 120,
    flex: 1,
  },
  largeCard: {
    padding: 20,
  },
  label: {
    color: pokerTheme.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  value: {
    color: pokerTheme.text,
    fontSize: 22,
    fontWeight: '700',
  },
  largeValue: {
    fontSize: 34,
  },
});
