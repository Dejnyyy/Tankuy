import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData, type EntryInput } from '@/context/DataContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, PressableScale } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EntryForm, ReceiptThumb, emptyForm, type FormState } from '@/components/EntryForm';
import { spacing } from '@/constants/Theme';
import { confirmDialog } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import { normalizeEntry, stationStats } from '@/lib/stats';
import { closeModal, entryToForm, saveWithDuplicateCheck } from '@/lib/entryHelpers';
import { Linking } from 'react-native';

export default function EntryScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries, vehicles, getRaw, addEntry, updateEntry, deleteEntry, loaded } = useData();
  const f = useFormat();
  const toast = useToast();
  const raw = id ? getRaw(id) : undefined;
  const editing = !!id;
  const stations = useMemo(() => stationStats(entries), [entries]);

  const initial = useMemo<FormState>(() => {
    if (raw) return entryToForm(raw, f);
    // New entry: preselect the vehicle you used last.
    const lastV = entries.length ? entries[entries.length - 1].vehicleId : null;
    return emptyForm(lastV ?? vehicles[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.id, loaded]);

  const onSubmit = async (data: EntryInput) => {
    try {
      if (editing && raw) {
        await updateEntry(raw.id, data);
        haptics.success();
        toast(t('entry.updated'));
        closeModal();
      } else {
        const saved = await saveWithDuplicateCheck(addEntry, data, t);
        if (!saved) return;
        haptics.success();
        toast(t('entry.saved'));
        closeModal();
      }
    } catch {
      haptics.error();
      toast(t('entry.saveError'), 'error');
    }
  };

  const onDelete = async () => {
    if (!raw) return;
    const ok = await confirmDialog(t('entry.deleteTitle'), t('entry.deleteMessage', { station: raw.stationName ?? t('entry.unknownStation'), date: f.date(normalizeEntry(raw as any).date) }), {
      confirm: t('common.delete'),
      cancel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteEntry(raw.id);
      toast(t('entry.deleted'));
      closeModal();
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  const missing = editing && loaded && !raw;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <PressableScale
            onPress={closeModal}
            accessibilityLabel={t('common.close')}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <FontAwesome name="times" size={16} color={colors.text} />
          </PressableScale>
          <AppText variant="heading">{editing ? t('entry.editTitle') : t('entry.newTitle')}</AppText>
          {editing && raw ? (
            <PressableScale
              onPress={onDelete}
              accessibilityLabel={t('common.delete')}
              style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.negativeSoft, alignItems: 'center', justifyContent: 'center' }}
            >
              <FontAwesome name="trash-o" size={16} color={colors.negative} />
            </PressableScale>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          {missing ? (
            <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.huge }}>
              <AppText variant="heading">{t('entry.notFound')}</AppText>
              <Button title={t('common.close')} onPress={closeModal} variant="secondary" />
            </View>
          ) : editing && !raw ? null : (
            <>
              {raw?.receiptImageUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl }}>
                  <ReceiptThumb uri={raw.receiptImageUrl} onPress={() => Linking.openURL(raw.receiptImageUrl!)} />
                  <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                    {t('entry.receiptAttached')}
                  </AppText>
                </View>
              ) : null}
              <EntryForm
                key={raw?.id ?? 'new'}
                initial={initial}
                vehicles={vehicles}
                stations={stations}
                entries={entries}
                excludeId={raw?.id}
                receiptImageUrl={raw?.receiptImageUrl}
                submitLabel={editing ? t('entry.saveChanges') : t('entry.save')}
                onSubmit={onSubmit}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
