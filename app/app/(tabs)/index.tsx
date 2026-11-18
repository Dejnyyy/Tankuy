import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, Delta, PressableScale, Screen, Section, Segmented, Skeleton, StatTable, ThemeToggle, Wordmark, useLayout } from '@/components/ui';
import { TrendChart, type ChartPoint } from '@/components/charts/TrendChart';
import { EntryRow } from '@/components/EntryRow';
import { spacing, typography } from '@/constants/Theme';
import { bucketLabel, plural, WEEKDAYS } from '@/lib/format';
import { buildSeries, computeStats, daysSinceLast, ymd, type Granularity, type Metric } from '@/lib/stats';

function DashHeader() {
  const { t } = useTranslation();
  const f = useFormat();
  const { isDesktop } = useLayout();
  const today = new Date();
  const date = `${WEEKDAYS[f.lang][(today.getDay() + 6) % 7]} ${f.dateLong(ymd(today))}`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: isDesktop ? spacing.huge : spacing.lg,
        paddingBottom: isDesktop ? spacing.xxxl : spacing.xl,
      }}
    >
      {isDesktop ? (
        <View>
          <AppText variant="title">{t('nav.overview')}</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
            {date}
          </AppText>
        </View>
      ) : (
        <Wordmark size={26} />
      )}
      <ThemeToggle />
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { entries, loading, refreshing, refresh, loaded } = useData();
  const f = useFormat();
  const { isWide } = useLayout();
  const [metric, setMetric] = useState<Metric>('cost');
  const [gran, setGran] = useState<Granularity>('month');
  const [selIdx, setSelIdx] = useState<number | null>(null);

  const now = useMemo(() => new Date(), [entries]);
  const stats = useMemo(() => computeStats(entries, now), [entries, now]);
  const sinceLast = daysSinceLast(entries, now);
  const last = entries.length ? entries[entries.length - 1] : null;
  const recent = useMemo(() => [...entries].reverse().slice(0, isWide ? 6 : 5), [entries, isWide]);

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

  const sel = selIdx ?? null;
  const selVal = sel !== null ? points[sel]?.value ?? null : null;
  let prevVal: number | null = null;
  if (sel !== null) for (let i = sel - 1; i >= 0; i--) if (points[i].value !== null && (metric === 'cost' || metric === 'liters' || points[i].value)) { prevVal = points[i].value; break; }
  const heroDelta = selVal !== null && prevVal ? selVal / prevVal - 1 : null;

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

  const daysWord = (n: number) => plural(n, [t('units.day1'), t('units.day2'), t('units.day5')], f.lang);

  if (loading && !loaded) return <DashboardSkeleton />;

  if (loaded && entries.length === 0) {
    return (
      <Screen>
        <DashHeader />
        <EmptyHero />
      </Screen>
    );
  }

  const unit = metric === 'price' || metric === 'consumption' ? f.metricUnit(metric) : null;
  const heroText = selVal === null ? '–' : f.metricFormat(metric, selVal).replace(/\u202F/g, '\u00A0');

  const hero = (
    <View style={{ gap: spacing.xl }}>
      <Segmented variant="tabs" options={metricOpts} value={metric} onChange={(m) => setMetric(m)} />
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <AppText variant="bodyBold" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {sel !== null && points[sel] ? points[sel].longLabel : '–'}
          </AppText>
          <Segmented options={granOpts} value={gran} onChange={setGran} size="sm" style={{ width: 168 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' }}>
          <AppText
            numberOfLines={1}
            style={[typography.display, isWide ? { fontSize: 88, lineHeight: 92, letterSpacing: -3.4 } : null, heroText.length > 9 && !isWide ? { fontSize: 52, lineHeight: 56 } : null]}
          >
            {heroText}
          </AppText>
          {unit ? (
            <AppText variant="heading" tone="secondary">
              {unit}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', minHeight: 20 }}>
          <Delta value={heroDelta} label={f.percent(heroDelta)} />
          <AppText variant="caption" tone="muted">
            {[heroDelta !== null ? t(`dash.vsPrev.${gran}`) : null, sel !== null && series[sel]?.count ? `${series[sel].count}× ${t('dash.fillups')}` : null]
              .filter(Boolean)
              .join(',  ')}
          </AppText>
        </View>
      </View>
      <TrendChart
        points={points}
        kind={metric === 'cost' || metric === 'liters' ? 'bar' : 'line'}
        height={isWide ? 320 : 220}
        animationKey={`${metric}-${gran}`}
        onSelect={setSelIdx}
        formatAxis={(v) => (metric === 'cost' && v >= 1000 ? `${f.n(v / 1000, v % 1000 ? 1 : 0)}k` : f.n(v, 0))}
        formatValue={(v) => (v === null ? '–' : unit ? `${f.metricFormat(metric, v)} ${unit}` : f.metricFormat(metric, v))}
        formatMeta={(i) => (series[i]?.count ? `${series[i].count}× ${t('dash.fillups')}` : null)}
        averageLabel="ø"
      />
    </View>
  );

  const nextIn = stats.nextFillEstimate?.inDays ?? null;
  const facts = (
    <StatTable
      rows={[
        {
          label: t('dash.kpi.sinceLast'),
          value: sinceLast === null ? '–' : sinceLast === 0 ? t('common.today') : `${sinceLast} ${daysWord(sinceLast)}`,
          sub: last ? `${f.date(last.date)}, ${last.station ?? t('entry.unknownStation')}` : null,
        },
        {
          label: t('dash.kpi.nextFill'),
          value: nextIn === null ? '–' : nextIn <= 0 ? t('dash.kpi.anyDay') : `${t('dash.kpi.in')} ${nextIn} ${daysWord(nextIn)}`,
          sub: stats.nextFillEstimate ? t('dash.kpi.nextFillSub', { days: f.n(stats.medianIntervalDays ?? stats.avgIntervalDays, 0) }) : null,
        },
        {
          label: t('dash.kpi.avgPrice'),
          value: f.price(stats.avgPrice),
          sub: stats.minPrice ? t('dash.kpi.priceRange', { min: f.price(stats.minPrice.value), max: f.price(stats.maxPrice?.value) }) : null,
        },
        {
          label: t('dash.kpi.consumption'),
          value: f.consumption(stats.consumption.avgL100),
          sub: stats.consumption.segments.length ? t('dash.kpi.consumptionSub', { km: f.distance(stats.consumption.totalKm) }) : t('dash.kpi.needMileage'),
        },
        {
          label: t('dash.kpi.costPerKm'),
          value: f.costPerKm(stats.consumption.costPerKm),
          sub: stats.kmPerMonth ? t('dash.kpi.kmPerMonth', { km: f.distance(stats.kmPerMonth) }) : null,
        },
      ]}
    />
  );

  const recentList = (
    <Section
      title={t('dash.recent')}
      right={
        <PressableScale onPress={() => router.push('/history')} hitSlop={8} accessibilityRole="link">
          <AppText variant="captionBold" style={{ textDecorationLine: 'underline' }}>
            {t('dash.seeAll')}
          </AppText>
        </PressableScale>
      }
    >
      <View>
        {recent.map((e, i) => (
          <View key={e.id}>
            {i > 0 && <HairlineInset />}
            <EntryRow entry={e} f={f} onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })} />
          </View>
        ))}
      </View>
    </Section>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={() => refresh()}>
      <DashHeader />
      {isWide ? (
        <View style={{ flexDirection: 'row', gap: spacing.huge, alignItems: 'flex-start' }}>
          <View style={{ flex: 3, gap: spacing.huge }}>{hero}</View>
          <View style={{ flex: 2, gap: spacing.huge, paddingTop: spacing.xs }}>
            <Section title={t('dash.summary')}>{facts}</Section>
            {recentList}
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.huge }}>
          {hero}
          <Section title={t('dash.summary')}>{facts}</Section>
          {recentList}
        </View>
      )}
    </Screen>
  );
}

function HairlineInset() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 4 + spacing.md }} />;
}

function EmptyHero() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: spacing.xxl, paddingTop: spacing.xxxl, maxWidth: 480 }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title" style={{ fontSize: 40, lineHeight: 44, letterSpacing: -1.6 }}>
          {t('dash.empty.title')}
        </AppText>
        <AppText tone="secondary">{t('dash.empty.message')}</AppText>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button title={t('dash.scan')} icon="camera" size="lg" onPress={() => router.push('/scan')} />
        <Button title={t('nav.addManual')} variant="secondary" size="lg" onPress={() => router.push('/entry')} />
      </View>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <Screen>
      <DashHeader />
      <View style={{ gap: spacing.xl }}>
        <Skeleton height={40} />
        <Skeleton height={64} width="60%" />
        <Skeleton height={220} />
        <Skeleton height={48} />
        <Skeleton height={48} />
      </View>
    </Screen>
  );
}
