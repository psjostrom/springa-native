import { StyleSheet, View } from 'react-native';
import type { StructureSegment } from '@/fixtures/agenda';
import { HrZoneColors } from '@/theme/colors';

type WorkoutStructureBarProps = {
  segments: StructureSegment[];
  height?: number;
};

export function WorkoutStructureBar({ segments, height = 40 }: WorkoutStructureBarProps) {
  const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
  if (totalWeight <= 0 || segments.length === 0) {
    return null;
  }

  return (
    <View style={[styles.row, { height }]}>
      {segments.map((segment, index) => (
        <View
          key={`${segment.zone}-${index}`}
          style={{
            flexGrow: segment.weight / totalWeight,
            flexBasis: 0,
            height: `${Math.max(segment.intensity, 0.15) * 100}%`,
            backgroundColor: HrZoneColors[segment.zone],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
});
