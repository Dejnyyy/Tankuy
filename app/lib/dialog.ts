import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm. react-native-web's Alert.alert is a no-op, so on web
 * we fall back to window.confirm (blocking, but reliable in a PWA).
 */
export function confirmDialog(
  title: string,
  message: string,
  opts: { confirm: string; cancel: string; destructive?: boolean },
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirm, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
