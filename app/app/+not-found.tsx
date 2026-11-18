import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { AppText, Button } from '@/components/ui';
import { spacing } from '@/constants/Theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Tankuy', headerShown: false }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg, backgroundColor: colors.background }}>
        <AppText variant="hero">404</AppText>
        <AppText tone="secondary">{t('common.notFound')}</AppText>
        <Button title={t('common.goHome')} onPress={() => router.replace('/')} />
      </View>
    </>
  );
}
