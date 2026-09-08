export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => ({ type: 'cancelled' as const }),
  signOut: async () => {},
};
