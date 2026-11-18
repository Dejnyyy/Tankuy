import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, Card, Delta, PressableScale, Screen, Segmented, Skeleton, StatTile, useLayout } from '@/components/ui';
import { TrendChart, type ChartPoint } from '@/components/charts/TrendChart';
import { SparkBars } from '@/components/charts/MiniCharts';
import { EntryRow } from '@/components/EntryRow';
import { radii, spacing } from '@/constants/Theme';
import { bucketLabel, plural, WEEKDAYS } from '@/lib/format';
import {
  buildSeries,
  computeStats,
  daysSinceLast,
  monthComparison,
  ymd,
  type Granularity,
  type Metric,
} from '@/lib/stats';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { entries, loading, refreshing, refresh, loaded } = useData();
  const f = useFormat();
  const { isWide } = useLayout();
  const [metric, setMetric] = useState<Metric>('cost');
  const [gran, setGran] = useState<Granularity>('month');
  const [selIdx, setSelIdx] = useState<number | null>(null);

  const now = useMemo(() => new Date(), [entries]);
  const stats = useMemo(() => computeStats(entries, now), [entries, now]);
  const month = useMemo(() => monthComparison(entries, now), [entries, now]);
  const sinceLast = daysSinceLast(entries, now);
  const last = entries.length ? entries[entries.length - 1] : null;
  const recent = useMemo(() => [...entries].reverse().slice(0, 4), [entries]);

  const series = useMemo(() => buildSeries(entries, metric, gran, now), [entries, metric, gran, now]);
  const points: ChartPoint[] = useMemo(
    () =>
      series.map((p) => ({
        label: bucketLabel(p.start, gran, f.lang),
        longLabel: bucketLabel(p.start, gran, f.lang, true),
        value: metric === 'cost' || metric === 'liters' ? (p.count ? f.metricValue(metric, p.value) : 0) : f.metricValue(metric, p.value),
      })),
    [series, gran, metric, f],
  );
  const monthSpark = useMemo(() => buildSeries(entries, 'cost', 'month', now, 6).map((p) => p.value), [entries, now]);

  const sel = selIdx ?? null;
  const selVal = sel !== null ? points[sel]?.value ?? null : null;
  let prevVal: number | null = null;
  if (sel !== null) for (let i = sel - 1; i >= 0; i--) if (points[i].value !== null && (metric === 'cost' || metric === 'liters' || points[i].value)) { prevVal = points[i].value; break; }
  const heroDelta = selVal !== null && prevVal ? selVal / prevVal - 1 : null;
  const upIsBad = metric === 'consumption' ? f.consumptionHigherIsWorse : metric !== 'liters';

  const metricOpts = [
    { value: 'cost' as const, label: t('dash.metric.cost') },
    { value: 'liters' as const, label: t('dash.metric.liters') },
    { value: 'price' as const, label: t('dash.metric.price') },
    { value: 'consumption' as const, label: t('dash.metric.consumption') },
  ];
  const granOpts = [
    { value: 'week' as const, label: t('dash.gran.week') },
    { value: 'month' as const, label: t('dash.gran.month') },
    { value: 'year' as const, label: t('dash.gran.year') },
  ];

  const firstName = (user?.name ?? '').split(' ')[0];
  const today = new Date();
  const overline = `${WEEKDAYS[f.lang][(today.getDay() + 6) % 7]} ${f.dateLong(ymd(today))}`;

  const daysWord = (n: number) => plural(n, [t('units.day1'), t('units.day2'), t('units.day5')], f.lang);

  if (loading && !loaded) return <DashboardSkeleton />;

  if (loaded && entries.length === 0) {
    return (
      <Screen title={firstName ? t('dash.hello', { name: firstName }) : t('nav.overview')} overline={overline}>
        <EmptyHero />
      </Screen>
    );
  }

  const chartCard = (
    <Animated.View entering={FadeInDown.duration(450)}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md }}>
          <Segmented options={metricOpts} value={metric} onChange={(m) => setMetric(m)} />
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
              <AppText variant="label" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                {sel !== null && points[sel] ? points[sel].longLabel : '–'}
              </AppText>
              <Segmented options={granOpts} value={gran} onChange={setGran} size="sm" style={{ width: 168 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <AppText variant="hero" numberOfLines={1}>
                {selVal === null ? '–' : f.metricFormat(metric, selVal)}
              </AppText>
              {metric === 'price' || metric === 'consumption' ? (
                <AppText variant="bodyBold" tone="muted">
                  {f.metricUnit(metric)}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Delta value={heroDelta} label={f.percent(heroDelta)} upIsBad={upIsBad} />
              <AppText variant="caption" tone="muted">
                {[heroDelta !== null ? t(`dash.vsPrev.${gran}`) : null, sel !== null && series[sel]?.count ? `${series[sel].count}× ${t('dash.fillups')}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.md }}>
          <TrendChart
            points={points}
            kind={metric === 'cost' || metric === 'liters' ? 'bar' : 'line'}
            height={isWide ? 300 : 230}
            animationKey={`${metric}-${gran}`}
            onSelect={setSelIdx}
            formatAxis={(v) => (metric === 'cost' && v >= 1000 ? `${f.n(v / 1000, v % 1000 ? 1 : 0)}k` : f.n(v, metric === 'price' || metric === 'consumption' ? 0 : 0))}
            formatValue={(v) => (v === null ? '–' : metric === 'price' || metric === 'consumption' ? `${f.metricFormat(metric, v)} ${f.metricUnit(metric)}` : f.metricFormat(metric, v))}
            formatMeta={(i) => (series[i]?.count ? `${series[i].count}× ${t('dash.fillups')}` : null)}
            averageLabel="ø"
          />
        </View>
      </Card>
    </Animated.View>
  );

  const nextIn = stats.nextFillEstimate?.inDays ?? null;
  const kpis = [
    {
      key: 'month',
      label: t('dash.kpi.thisMonth'),
      value: f.money(month.thisMonth.cost),
      sub: t('dash.kpi.lastMonth', { value: f.money(month.lastMonth.cost) }),
      icon: 'calendar',
      footer: (
        <View style={{ gap: 8 }}>
          <Delta value={month.change} label={f.percent(month.change)} />
          <SparkBars values={monthSpark} />
        </View>
      ),
    },
    {
      key: 'since',
      label: t('dash.kpi.sinceLast'),
      value: sinceLast === null ? '–' : sinceLast === 0 ? t('common.today') : `${sinceLast} ${daysWord(sinceLast)}`,
      sub: last ? `${f.date(last.date)} · ${last.station ?? t('entry.unknownStation')}` : null,
      icon: 'clock-o',
    },
    {
      key: 'price',
      label: t('dash.kpi.avgPrice'),
      value: f.price(stats.avgPrice),
      sub: stats.minPrice ? t('dash.kpi.priceRange', { min: f.price(stats.minPrice.value), max: f.price(stats.maxPrice?.value) }) : null,
      icon: 'tag',
      footer: stats.priceChangeRecent !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Delta value={stats.priceChangeRecent} label={f.percent(stats.priceChangeRecent)} />
          <AppText variant="caption" tone="muted">{t('dash.kpi.last90')}</AppText>
        </View>
      ) : null,
    },
    {
      key: 'cons',
      label: t('dash.kpi.consumption'),
      value: f.consumption(stats.consumption.avgL100),
      sub: stats.consumption.segments.length
        ? t('dash.kpi.consumptionSub', { km: f.distance(stats.consumption.totalKm) })
        : t('dash.kpi.needMileage'),
      icon: 'tachometer',
    },
    {
      key: 'cpk',
      label: t('dash.kpi.costPerKm'),
      value: f.costPerKm(stats.consumption.costPerKm),
      sub: stats.kmPerMonth ? t('dash.kpi.kmPerMonth', { km: f.distance(stats.kmPerMonth) }) : null,
      icon: 'road',
    },
    {
      key: 'next',
      label: t('dash.kpi.nextFill'),
      value:
        nextIn === null ? '–' : nextIn <= 0 ? t('dash.kpi.anyDay') : `${t('dash.kpi.in')} ${nextIn} ${daysWord(nextIn)}`,
      sub: stats.nextFillEstimate ? t('dash.kpi.nextFillSub', { days: f.n(stats.medianIntervalDays ?? stats.avgIntervalDays, 0) }) : null,
      icon: 'bell-o',
    },
  ];

  const kpiGrid = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {kpis.map((k, i) => (
        <Animated.View
          key={k.key}
          entering={FadeInDown.delay(80 + i * 45).duration(420)}
          style={{ flexBasis: isWide ? '47%' : '46%', flexGrow: 1 }}
        >
          <StatTile label={k.label} value={k.value} sub={k.sub} icon={k.icon} footer={k.footer} onPress={() => router.push('/stats')} style={{ height: '100%' }} />
        </Animated.View>
      ))}
    </View>
  );

  const actions = (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Button title={t('dash.scan')} icon="camera" variant="accent" size="lg" onPress={() => router.push('/scan')} style={{ flex: 1 }} />
      <Button title={t('dash.manual')} icon="pencil" variant="secondary" size="lg" onPress={() => router.push('/entry')} />
    </View>
  );

  const recentCard = (
    <Animated.View entering={FadeInDown.delay(200).duration(450)}>
      <Card padded={false} style={{ paddingVertical: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <AppText variant="heading">{t('dash.recent')}</AppText>
          <PressableScale onPress={() => router.push('/history')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 }}>
            <AppText variant="captionBold" tone="tint">
              {t('dash.seeAll')}
            </AppText>
            <FontAwesome name="angle-right" size={14} color={colors.tint} />
          </PressableScale>
        </View>
        {recent.map((e) => (
          <EntryRow key={e.id} entry={e} f={f} onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })} />
        ))}
      </Card>
    </Animated.View>
  );

  return (
    <Screen
      title={firstName ? t('dash.hello', { name: firstName }) : t('nav.overview')}
      overline={overline}
      refreshing={refreshing}
      onRefresh={() => refresh()}
    >
      {isWide ? (
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' }}>
            <View style={{ flex: 3, gap: spacing.lg }}>
              {chartCard}
              {recentCard}
            </View>
            <View style={{ flex: 2, gap: spacing.lg }}>
              {actions}
              {kpiGrid}
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {actions}
          {chartCard}
          {kpiGrid}
          {recentCard}
        </View>
      )}
    </Screen>
  );
}

function EmptyHero() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.lg }}>
        <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: colors.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="tint" size={36} color={colors.tint} />
        </View>
        <View style={{ gap: 6, alignItems: 'center', maxWidth: 360 }}>
          <AppText variant="title" align="center" style={{ fontSize: 24, lineHeight: 30 }}>
            {t('dash.empty.title')}
          </AppText>
          <AppText tone="secondary" align="center">
            {t('dash.empty.message')}
          </AppText>
        </View>
        <View style={{ gap: spacing.sm, alignSelf: 'stretch', maxWidth: 360, width: '100%', marginHorizontal: 'auto' }}>
          <Button title={t('dash.scan')} icon="camera" variant="accent" size="lg" onPress={() => router.push('/scan')} />
          <Button title={t('dash.manual')} icon="pencil" variant="secondary" size="lg" onPress={() => router.push('/entry')} />
        </View>
      </Card>
    </Animated.View>
  );
}

function DashboardSkeleton() {
  return (
    <Screen title=" ">
      <View style={{ gap: spacing.lg }}>
        <Skeleton height={56} radius={radii.md} />
        <Skeleton height={330} radius={radii.lg} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Skeleton height={120} radius={radii.lg} style={{ flex: 1 }} width="auto" />
          <Skeleton height={120} radius={radii.lg} style={{ flex: 1 }} width="auto" />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Skeleton height={120} radius={radii.lg} style={{ flex: 1 }} width="auto" />
          <Skeleton height={120} radius={radii.lg} style={{ flex: 1 }} width="auto" />
        </View>
      </View>
    </Screen>
  );
}
