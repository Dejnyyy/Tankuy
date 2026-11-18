import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { radii, spacing } from '@/constants/Theme';
import { AppText } from './AppText';

type Kind = 'success' | 'error' | 'info';
interface ToastMsg {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback((text: string, kind: Kind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), kind, text });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + spacing.md, left: 0, right: 0, alignItems: 'center' }}>
        {msg && (
          <Animated.View
            key={msg.id}
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(160)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              maxWidth: 420,
              marginHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.md,
              backgroundColor: msg.kind === 'error' ? colors.negative : colors.buttonPrimary,
            }}
          >
            <AppText variant="bodyBold" style={{ color: msg.kind === 'error' ? '#FFFFFF' : colors.buttonPrimaryText }} numberOfLines={2}>
              {msg.text}
            </AppText>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
