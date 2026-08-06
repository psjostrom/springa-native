import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SpringaColors } from '@/theme/colors';

type SpringaMarkProps = {
  size?: number;
  color?: string;
};

/**
 * Official Springa mark (`springa-mark.svg`).
 * Square box matches PWA `w-6 h-6`. Extra nudge beyond the PWA's
 * `translate-y-[1.5px]` compensates for RN Android text metrics.
 */
export function SpringaMark({
  size = 24,
  color = SpringaColors.brand,
}: SpringaMarkProps) {
  return (
    <View style={[styles.nudge, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 432 474" accessibilityElementsHidden>
        <Path
          d="M 357.8,42.9 L 196.9,264.7 A 75,75 0 1,1 106.3,151.8 Z"
          fill={color}
        />
        <Path
          d="M 72.2,461.1 L 233.1,239.3 A 75,75 0 1,1 323.7,352.2 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  nudge: {
    transform: [{ translateY: 2.5 }],
  },
});
