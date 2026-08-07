export const queryKeys = {
  settings: (identity: string) => ['settings', identity] as const,
  calendar: (identity: string) => ['calendar', identity] as const,
  bg: (identity: string) => ['bg', identity] as const,
};
