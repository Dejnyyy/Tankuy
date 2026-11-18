import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, Card, Chip, PressableScale, Screen, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EntryRow } from '@/components/EntryRow';
import { radii, spacing } from '@/constants/Theme';
import { confirmDialog } from '@/lib/dialog';
import { haptics } from '@/lib/haptics';
import { filterEntries, rangeFrom, type Entry, type RangeKey } from '@/lib/stats';

const PAGE = 80;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { entries, vehicles, loading, loaded, refreshing, refresh, deleteEntry } = useData();
  const f = useFormat();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [vehicleId, setVehicleId] = useState('all');
  const [range, setRange] = useState<RangeKey>('all');
  const [limit, setLimit] = useState(PAGE);

  const now = useMemo(() => new Date(), [entries]);
  const filtered = useMemo(() => {
    const base = filterEntries(entries, { vehicleId, from: rangeFrom(range, now) });
    const needle = q.trim().toLowerCase();
    const list = needle
      ? base.filter((e) =>
          [e.station, e.address, e.notes, e.vehicleName, e.date, String(Math.round(e.cost))]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(needle)),
        )
      : base;
    return [...list].reverse();
  }, [entries, vehicleId, range, q, now]);

  const groups = useMemo(() => {
    const out: { key: string; items: Entry[]; cost: number; liters: number }[] = [];
    for (const e of filtered.slice(0, limit)) {
      const k = e.date.slice(0, 7);
      let g = out[out.length - 1];
      if (!g || g.key !== k) {
        g = { key: k, items: [], cost: 0, liters: 0 };
        out.push(g);
      }
      g.items.push(e);
    }
    // Totals use the full filtered month, not just the visible page.
    for (const g of out) {
      for (const e of filtered) {
        if (e.date.startsWith(g.key)) {
          g.cost += e.cost;
          g.liters += e.liters ?? 0;
        }
      }
    }
    return out;
  }, [filtered, limit]);

  const totals = useMemo(
    () => ({ cost: filtered.reduce((a, e) => a + e.cost, 0), liters: filtered.reduce((a, e) => a + (e.liters ?? 0), 0) }),
    [filtered],
  );

  const askDelete = async (e: Entry) => {
    haptics.warning();
    const ok = await confirmDialog(t('entry.deleteTitle'), t('entry.deleteMessage', { station: e.station ?? t('entry.unknownStation'), date: f.date(e.date) }), {
      confirm: t('common.delete'),
      cancel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteEntry(e.id);
      toast(t('entry.deleted'));
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  const ranges: { key: RangeKey; label: string }[] = [
    { key: 'all', label: t('stats.range.all') },
    { key: 'ytd', label: t('stats.range.ytd') },
    { key: '12m', label: t('stats.range.12m') },
    { key: '3m', label: t('stats.range.3m') },
  ];
  const filtersActive = q || vehicleId !== 'all' || range !== 'all';

  return (
    <Screen
      title={t('nav.history')}
      subtitle={
        loaded
          ? `${filtered.length}× · ${f.money(totals.cost)} · ${f.volume(totals.liters, 0)}`
          : undefined
      }
      right={
        <PressableScale
          onPress={() => router.push('/entry')}
          haptic="light"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.buttonPrimary, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={t('nav.addManual')}
        >
          <FontAwesome name="plus" size={16} color={colors.buttonPrimaryText} />
        </PressableScale>
      }
      refreshing={refreshing}
      onRefresh={() => refresh()}
    >
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            height: 46,
            paddingHorizontal: spacing.md,
            borderRadius: radii.md,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <FontAwesome name="search" size={14} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={(v) => {
              setQ(v);
              setLimit(PAGE);
            }}
            placeholder={t('history.search')}
            placeholderTextColor={colors.placeholder}
            style={[{ flex: 1, color: colors.text, fontSize: 15, height: '100%' }, { outlineStyle: 'none' } as any]}
            returnKeyType="search"
          />
          {q ? (
            <PressableScale onPress={() => setQ('')} hitSlop={10}>
              <FontAwesome name="times-circle" size={16} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {ranges.map((r) => (
            <Chip key={r.key} label={r.label} active={range === r.key} onPress={() => setRange(r.key)} />
          ))}
          {vehicles.length > 1 && <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 4 }} />}
          {vehicles.length > 1 &&
            [{ id: 'all', name: t('stats.allVehicles') }, ...vehicles].map((v) => (
              <Chip key={v.id} label={v.name} icon={v.id === 'all' ? 'th-large' : 'car'} active={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
            ))}
        </ScrollView>
      </View>

      {loading && !loaded ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={64} radius={radii.md} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeIn}>
          <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.huge }}>
            <FontAwesome name={filtersActive ? 'search' : 'list-ul'} size={30} color={colors.textMuted} />
            <AppText variant="heading" align="center">
              {filtersActive ? t('history.noMatch') : t('history.empty.title')}
            </AppText>
            <AppText tone="secondary" align="center" style={{ maxWidth: 320 }}>
              {filtersActive ? t('history.noMatchHint') : t('history.empty.message')}
            </AppText>
            {filtersActive ? (
              <Button
                title={t('history.clearFilters')}
                variant="secondary"
                onPress={() => {
                  setQ('');
                  setVehicleId('all');
                  setRange('all');
                }}
              />
            ) : (
              <Button title={t('dash.scan')} icon="camera" variant="accent" onPress={() => router.push('/scan')} />
            )}
          </Card>
        </Animated.View>
      ) : (
        <View style={{ gap: spacing.xl }}>
          {groups.map((g, gi) => (
            <Animated.View key={g.key} entering={FadeInDown.delay(Math.min(gi, 6) * 50).duration(380)} layout={LinearTransition.duration(250)} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <AppText variant="heading">{f.month(g.key)}</AppText>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="statSm" style={{ fontSize: 15 }}>
                    {f.money(g.cost)}
                  </AppText>
                  <AppText variant="mono" tone="muted">
                    {filtered.filter((e) => e.date.startsWith(g.key)).length}× · {f.volume(g.liters, 0)}
                  </AppText>
                </View>
              </View>
              <Card padded={false} style={{ paddingVertical: 4 }}>
                {g.items.map((e, i) => (
                  <Animated.View key={e.id} exiting={FadeOut.duration(180)} layout={LinearTransition.duration(220)}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 68 }} />}
                    <EntryRow
                      entry={e}
                      f={f}
                      showVehicle={vehicles.length > 1}
                      onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
                      onLongPress={() => askDelete(e)}
                    />
                  </Animated.View>
                ))}
              </Card>
            </Animated.View>
          ))}
          {filtered.length > limit && (
            <Button title={t('history.more', { count: filtered.length - limit })} variant="secondary" onPress={() => setLimit((l) => l + PAGE)} />
          )}
          <AppText variant="caption" tone="muted" align="center">
            {t('history.hint')}
          </AppText>
        </View>
      )}
    </Screen>
  );
}
