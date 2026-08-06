import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SpringaColors } from '@/theme/colors';

/** Same as bar bg so Views BottomNavigationView ripple/indicator are invisible. */
const TAB_CHROME_HIDE = SpringaColors.surface;

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={SpringaColors.brand}
      backgroundColor={SpringaColors.surface}
      labelVisibilityMode="labeled"
      disableIndicator
      rippleColor={TAB_CHROME_HIDE}
      indicatorColor={TAB_CHROME_HIDE}
      iconColor={{
        default: SpringaColors.muted,
        selected: SpringaColors.brand,
      }}
      labelStyle={{
        default: { color: SpringaColors.muted },
        selected: { color: SpringaColors.brand },
      }}>
      <NativeTabs.Trigger name="index" disableIndicator rippleColor={TAB_CHROME_HIDE}>
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="intel" disableIndicator rippleColor={TAB_CHROME_HIDE}>
        <NativeTabs.Trigger.Label>Intel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach" disableIndicator rippleColor={TAB_CHROME_HIDE}>
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="brain.head.profile" md="smart_toy" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planner" disableIndicator rippleColor={TAB_CHROME_HIDE}>
        <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="layers" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="simulate" disableIndicator rippleColor={TAB_CHROME_HIDE}>
        <NativeTabs.Trigger.Label>Simulate</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flask" md="science" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
