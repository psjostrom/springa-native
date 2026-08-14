import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

export function useKeyboardDismissedPresentation(isPresented: boolean) {
  const [previousIsPresented, setPreviousIsPresented] = useState(isPresented);
  const [ready, setReady] = useState(() => isPresented && !Keyboard.isVisible());

  if (isPresented !== previousIsPresented) {
    setPreviousIsPresented(isPresented);
    setReady(isPresented && !Keyboard.isVisible());
  }

  useEffect(() => {
    if (!isPresented || ready) return;

    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      subscription.remove();
      setReady(true);
    });
    Keyboard.dismiss();

    return () => subscription.remove();
  }, [isPresented, ready]);

  return isPresented && ready;
}
