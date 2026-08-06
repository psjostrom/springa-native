import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SpringaColors } from '@/theme/colors';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={SpringaColors.brand}
      labelStyle={{ color: SpringaColors.muted }}
      backgroundColor={SpringaColors.surface}
      indicatorColor={SpringaColors.surfaceAlt}>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="intel">
        <NativeTabs.Trigger.Label>Intel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="brain.head.profile" md="smart_toy" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planner">
        <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack.3d.up" md="layers" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="simulate">
        <NativeTabs.Trigger.Label>Simulate</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flask" md="science" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
