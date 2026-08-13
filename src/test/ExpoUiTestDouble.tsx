import type { ReactNode } from 'react';

export function BottomSheet({
  children,
  isPresented,
}: {
  children: ReactNode;
  isPresented: boolean;
}) {
  return isPresented ? <>{children}</> : null;
}

export function RNHostView({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Host({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ModalBottomSheet({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function presentationBackground(color: string) {
  return { $type: 'presentationBackground', color };
}
