import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SpringaColors } from '@/theme/colors';

/**
 * Views BottomNavigationView ripples the whole tab cell (Compose clips to the
 * pill). Opaque bar-bg: RippleDrawable alpha-animates, but C over C is invisible.
 * Near-transparent colors get replaced by Material's default huge ripple.
 */
const TAB_CHROME_HIDE = SpringaColors.surface;

const tabChrome = {
  disableIndicator: true as const,
  rippleColor: TAB_CHROME_HIDE,
  indicatorColor: TAB_CHROME_HIDE,
};

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={SpringaColors.brand}
      backgroundColor={SpringaColors.surface}
      labelVisibilityMode="labeled"
      {...tabChrome}
      iconColor={{
        default: SpringaColors.muted,
        selected: SpringaColors.brand,
      }}
      labelStyle={{
        default: { color: SpringaColors.muted },
        selected: { color: SpringaColors.brand },
      }}>
      <NativeTabs.Trigger name="index" {...tabChrome}>
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="intel" {...tabChrome}>
        <NativeTabs.Trigger.Label>Intel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach" {...tabChrome}>
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="brain.head.profile" md="smart_toy" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planner" {...tabChrome}>
        <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="layers" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="simulate" {...tabChrome}>
        <NativeTabs.Trigger.Label>Simulate</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flask" md="science" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
