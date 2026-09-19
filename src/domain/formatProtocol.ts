import type {
  CamAPSAutoSubmode,
  CamAPSMode,
  ProtocolTiming,
  WorkoutProtocol,
} from '@/api/types';

export function formatFeel(feel: number): string {
  switch (feel) {
    case 1:
      return 'Very Strong';
    case 2:
      return 'Strong';
    case 3:
      return 'Normal';
    case 4:
      return 'Weak';
    case 5:
      return 'Very Weak';
    default:
      return `${feel}/5`;
  }
}

export function formatTiming(timing: ProtocolTiming): string {
  switch (timing) {
    case '>2h':
      return '>2h before';
    case '1-2h':
      return '1–2h before';
    case '<30m':
      return '<30m before';
    case 'at_start':
      return 'At start';
  }
}

export function formatMode(
  mode: CamAPSMode,
  submode?: CamAPSAutoSubmode | null,
  targetBg?: number | null,
  manualUh?: number | null,
): string {
  if (mode === 'disconnected') return 'Disconnected';
  if (mode === 'manual') return manualUh != null ? `Manual ${manualUh} u/h` : 'Manual';
  const sub = submode === 'boost' ? 'Boost' : submode === 'normal' ? 'Normal' : 'Ease off';
  const target = targetBg != null ? ` (${targetBg} mmol/L)` : '';
  return `Auto ${sub}${target}`;
}

export function getProtocolPills(protocol: WorkoutProtocol): string[] {
  const pills: string[] = [];

  pills.push(
    formatMode(
      protocol.beforeMode,
      protocol.beforeAutoSubmode,
      protocol.beforeTargetBg,
      protocol.beforeManualUh,
    ),
  );

  pills.push(formatTiming(protocol.beforeTiming));

  if (!protocol.duringSame && protocol.duringMode != null) {
    pills.push(
      `During: ${formatMode(
        protocol.duringMode,
        protocol.duringAutoSubmode,
        protocol.duringTargetBg,
        protocol.duringManualUh,
      )}`,
    );
  }

  if (protocol.rescueCarbsG != null && protocol.rescueCarbsG > 0) {
    pills.push(`Rescue: ${protocol.rescueCarbsG}g`);
  }

  return pills;
}
