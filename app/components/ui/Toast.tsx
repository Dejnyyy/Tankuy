import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { elevation, radii, spacing } from '@/constants/Theme';
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
  const { colors, isDark } = useTheme();

  const show = useCallback((text: string, kind: Kind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), kind, text });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  const icon = msg?.kind === 'error' ? 'exclamation-circle' : msg?.kind === 'info' ? 'info-circle' : 'check-circle';
  const iconColor = msg?.kind === 'error' ? colors.negative : msg?.kind === 'info' ? colors.info : colors.positive;

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + spacing.sm, left: 0, right: 0, alignItems: 'center' }}>
        {msg && (
          <Animated.View
            key={msg.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(200)}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                maxWidth: 420,
                marginHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.full,
                backgroundColor: colors.buttonPrimary,
              },
              elevation(3, colors.shadow, isDark),
            ]}
          >
            <FontAwesome name={icon as any} size={16} color={iconColor} />
            <AppText variant="bodyBold" tone="inverse" numberOfLines={2}>
              {msg.text}
            </AppText>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
