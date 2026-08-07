import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBgQuery } from '@/query/useBgQuery';
import { SpringaColors } from '@/theme/colors';

const STALE_MS = 15 * 60 * 1000;

export function bgColor(mmol: number): string {
  if (mmol < 3.5 || mmol > 14.0) return SpringaColors.error;
  if (mmol < 4.0 || mmol > 10.0) return SpringaColors.warning;
  return SpringaColors.success;
}

function relativeTime(ts: number, now: number): string {
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function BgPill() {
  const { enabled, data } = useBgQuery();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!enabled) return null;

  const current = data?.current;
  if (current == null) return null;
  if (now - current.ts > STALE_MS) return null;

  const color = bgColor(current.mmol);
  const arrow = data?.trend?.arrow ?? current.arrow;

  return (
    <View
      accessibilityLabel={`Blood glucose ${current.mmol.toFixed(1)}`}
      style={[
        styles.pill,
        {
          borderColor: color + '40',
          backgroundColor: color + '15',
        },
      ]}
    >
      <Text style={[styles.text, { color }]}>
        {current.mmol.toFixed(1)}
        {arrow ? ` ${arrow}` : ''}
        {` ${relativeTime(current.ts, now)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: '600' },
});
