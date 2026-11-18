import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, Card, Chip, Screen, Segmented, Skeleton, StatTile, useLayout } from '@/components/ui';
import { TrendChart } from '@/components/charts/TrendChart';
import { DistributionBars, RankList } from '@/components/charts/MiniCharts';
import { radii, spacing } from '@/constants/Theme';
import { bucketLabel, plural, WEEKDAYS_SHORT } from '@/lib/format';
import {
  buildSeries,
  computeStats,
  filterEntries,
  parseDate,
  priceSeries,
  rangeFrom,
  yearProjection,
  ymd,
  type RangeKey,
} from '@/lib/stats';

function Section({ n, title, caption, children, delay = 0 }: { n: string; title: string; caption?: string; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(450)} style={{ gap: spacing.md }}>
      <View style={{ gap: 2, marginTop: spacing.lg }}>
        <AppText variant="mono" tone="tint">
          {n}
        </AppText>
        <AppText variant="heading" style={{ fontSize: 21, lineHeight: 26 }}>
          {title}
        </AppText>
        {caption ? (
          <AppText variant="caption" tone="secondary">
            {caption}
          </AppText>
        ) : null}
      </View>
      {children}
    </Animated.View>
  );
}

function Row({ children, quarter }: { children: React.ReactNode; quarter?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>{React.Children.map(children, (c) => (c ? <View style={{ flexBasis: quarter ? '22%' : '46%', flexGrow: 1 }}>{c}</View> : null))}</View>;
}

function Insight({ icon, text, tone = 'default' }: { icon: string; text: string; tone?: 'default' | 'tint' }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: tone === 'tint' ? colors.tintSoft : colors.surface2,
        borderWidth: 1,
        borderColor: tone === 'tint' ? 'transparent' : colors.border,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: tone === 'tint' ? colors.tint : colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name={icon as any} size={15} color={tone === 'tint' ? colors.onTint : colors.text} />
      </View>
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

function RecordRow({ label, value, sub, last }: { label: string; value: string; sub?: string | null; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: spacing.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border, borderStyle: 'dashed' }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="body" numberOfLines={1}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="mono" tone="muted" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
      <AppText variant="statSm">{value}</AppText>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { entries, vehicles, loading, loaded, refreshing, refresh } = useData();
  const f = useFormat();
  const { isWide } = useLayout();
  const [range, setRange] = useState<RangeKey>('12m');
  const [vehicleId, setVehicleId] = useState<string>('all');

  const now = useMemo(() => new Date(), [entries]);
  const from = rangeFrom(range, now);
  const scoped = useMemo(() => filterEntries(entries, { vehicleId, from }), [entries, vehicleId, from]);
  const vehicleScoped = useMemo(() => filterEntries(entries, { vehicleId }), [entries, vehicleId]);
  const s = useMemo(() => computeStats(scoped, now), [scoped, now]);
  const proj = useMemo(() => yearProjection(vehicleScoped, now), [vehicleScoped, now]);

  const monthsCount = useMemo(() => {
    const start = from ?? scoped[0]?.date ?? ymd(now);
    const d = parseDate(start);
    return Math.min(60, Math.max(1, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth() + 1));
  }, [from, scoped, now]);
  const monthly = useMemo(() => buildSeries(scoped, 'cost', 'month', now, monthsCount), [scoped, now, monthsCount]);
  const prices = useMemo(() => priceSeries(scoped), [scoped]);

  const daysWord = (n: number) => plural(n, [t('units.day1'), t('units.day2'), t('units.day5')], f.lang);
  const timesWord = (n: number) => plural(n, [t('units.time1'), t('units.time2'), t('units.time5')], f.lang);
  const weekdayIn = t('stats.weekdayIn', { returnObjects: true }) as string[];
  const dayparts = t('stats.dayparts', { returnObjects: true }) as string[];

  const ranges = [
    { value: '3m' as const, label: t('stats.range.3m') },
    { value: '6m' as const, label: t('stats.range.6m') },
    { value: '12m' as const, label: t('stats.range.12m') },
    { value: 'ytd' as const, label: t('stats.range.ytd') },
    { value: 'all' as const, label: t('stats.range.all') },
  ];

  const filters = (
    <View style={{ gap: spacing.sm }}>
      <Segmented options={ranges} value={range} onChange={setRange} />
      {vehicles.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label={t('stats.allVehicles')} icon="th-large" active={vehicleId === 'all'} onPress={() => setVehicleId('all')} />
          {vehicles.map((v) => (
            <Chip key={v.id} label={v.name} icon="car" active={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading && !loaded) {
    return (
      <Screen title={t('nav.stats')}>
        <View style={{ gap: spacing.lg }}>
          <Skeleton height={38} />
          <Skeleton height={110} radius={radii.lg} />
          <Skeleton height={260} radius={radii.lg} />
        </View>
      </Screen>
    );
  }

  if (s.count === 0) {
    return (
      <Screen title={t('nav.stats')} refreshing={refreshing} onRefresh={() => refresh()}>
        {filters}
        <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.huge, marginTop: spacing.lg }}>
          <FontAwesome name="bar-chart" size={34} color={colors.textMuted} />
          <AppText variant="heading" align="center">
            {entries.length ? t('stats.emptyRange') : t('stats.empty')}
          </AppText>
          <AppText tone="secondary" align="center" style={{ maxWidth: 340 }}>
            {t('stats.emptyHint')}
          </AppText>
          {!entries.length && <Button title={t('dash.scan')} icon="camera" variant="accent" onPress={() => router.push('/scan')} />}
        </Card>
      </Screen>
    );
  }

  const topWd = s.weekday.top;
  const topDp = s.dayparts.top;
  const cons = s.consumption;
  const trend = s.priceTrendPerMonth;

  // ── Sections ──
  const summary = (
    <Row quarter={isWide}>
      <StatTile label={t('stats.totalSpent')} value={f.money(s.totalCost)} sub={t('stats.avgPerFill', { value: f.money(s.avgCost) })} icon="money" accent={colors.tint} />
      <StatTile label={t('stats.fillups')} value={f.n(s.count)} sub={s.avgMonthlyFills ? t('stats.perMonth', { value: f.n(s.avgMonthlyFills, 1) }) : null} icon="tint" />
      <StatTile label={t('stats.totalLiters')} value={f.volume(s.totalLiters, 0)} sub={t('stats.avgPerFill', { value: f.volume(s.avgLiters) })} icon="flask" />
      <StatTile
        label={t('stats.distance')}
        value={cons.totalKm ? f.distance(cons.totalKm) : '–'}
        sub={s.latestMileage ? t('stats.odometer', { value: f.distance(s.latestMileage) }) : t('dash.kpi.needMileage')}
        icon="road"
      />
    </Row>
  );

  const spend = (
    <Section n="01" title={t('stats.sec.spend')} caption={t('stats.sec.spendCaption')} delay={60}>
      <Card style={{ paddingHorizontal: spacing.sm }}>
        <TrendChart alwaysTooltip
          kind="bar"
          height={isWide ? 260 : 210}
          animationKey={`m-${range}-${vehicleId}`}
          points={monthly.map((p) => ({
            label: bucketLabel(p.start, 'month', f.lang),
            longLabel: bucketLabel(p.start, 'month', f.lang, true),
            value: f.moneyValue(p.value),
          }))}
          formatAxis={(v) => (v >= 1000 ? `${f.n(v / 1000, v % 1000 ? 1 : 0)}k` : f.n(v))}
          formatValue={(v) => (v === null ? '–' : `${f.n(v)} ${f.currencySymbol}`)}
          formatMeta={(i) => (monthly[i]?.count ? `${monthly[i].count}× ${t('dash.fillups')}` : null)}
        />
      </Card>
      <Row>
        <StatTile size="sm" label={t('stats.avgMonth')} value={f.money(s.avgMonthlyCost)} />
        <StatTile size="sm" label={t('stats.projection', { year: proj.year })} value={f.money(proj.projected)} sub={t('stats.ytd', { value: f.money(proj.ytd) })} />
        <StatTile size="sm" label={t('stats.perYear')} value={f.money((s.avgMonthlyCost ?? 0) * 12)} sub={t('stats.basedOnAvg')} />
        <StatTile
          size="sm"
          label={t('stats.priciestMonth')}
          value={s.priciestMonth ? f.money(s.priciestMonth.cost) : '–'}
          sub={s.priciestMonth ? f.month(s.priciestMonth.key) : null}
        />
      </Row>
    </Section>
  );

  const price = (
    <Section n="02" title={t('stats.sec.price')} caption={t('stats.sec.priceCaption')} delay={100}>
      {prices.length >= 2 ? (
        <Card style={{ paddingHorizontal: spacing.sm }}>
          <TrendChart alwaysTooltip
            kind="line"
            height={isWide ? 240 : 200}
            animationKey={`p-${range}-${vehicleId}`}
            color={colors.series[1]}
            points={prices.map((p) => ({ label: f.date(p.date, false), longLabel: `${f.date(p.date)}${p.station ? ` · ${p.station}` : ''}`, value: f.units.formatPricePerVolume(p.value) }))}
            formatAxis={(v) => f.n(v, 0)}
            formatValue={(v) => (v === null ? '–' : `${f.n(v, 2)} ${f.metricUnit('price')}`)}
          />
        </Card>
      ) : null}
      <Row>
        <StatTile size="sm" label={t('stats.avgPrice')} value={f.price(s.avgPrice)} sub={t('stats.weighted')} />
        <StatTile size="sm" label={t('stats.minPrice')} value={f.price(s.minPrice?.value)} sub={s.minPrice ? `${f.date(s.minPrice.date)}${s.minPrice.station ? ` · ${s.minPrice.station}` : ''}` : null} accent={colors.positive} icon="arrow-down" />
        <StatTile size="sm" label={t('stats.maxPrice')} value={f.price(s.maxPrice?.value)} sub={s.maxPrice ? `${f.date(s.maxPrice.date)}${s.maxPrice.station ? ` · ${s.maxPrice.station}` : ''}` : null} accent={colors.negative} icon="arrow-up" />
        <StatTile
          size="sm"
          label={t('stats.trend')}
          value={trend === null ? '–' : `${trend > 0 ? '+' : trend < 0 ? '−' : ''}${f.n(Math.abs(f.units.formatPricePerVolume(trend) ?? 0), 2)}`}
          sub={trend === null ? t('stats.trendNeed') : t('stats.trendSub', { unit: f.metricUnit('price') })}
          accent={trend === null ? undefined : trend > 0 ? colors.negative : colors.positive}
          icon={trend !== null && trend > 0 ? 'line-chart' : 'level-down'}
        />
      </Row>
      {trend !== null && Math.abs(trend) > 0.01 && (
        <Insight
          icon={trend > 0 ? 'arrow-circle-up' : 'arrow-circle-down'}
          text={t(trend > 0 ? 'stats.trendUp' : 'stats.trendDown', { value: f.price(Math.abs(trend)) })}
        />
      )}
    </Section>
  );

  const consumption = (
    <Section n="03" title={t('stats.sec.consumption')} caption={t('stats.sec.consumptionCaption')} delay={140}>
      {cons.segments.filter((sg) => !sg.outlier).length >= 2 ? (
        <Card style={{ paddingHorizontal: spacing.sm }}>
          <TrendChart alwaysTooltip
            kind="line"
            height={isWide ? 240 : 200}
            color={colors.series[2]}
            animationKey={`c-${range}-${vehicleId}`}
            points={cons.segments.filter((sg) => !sg.outlier).map((sg) => ({
              label: f.date(sg.date, false),
              longLabel: `${f.date(sg.fromDate, false)} – ${f.date(sg.date, false)} · ${f.distance(sg.km)}`,
              value: f.metricValue('consumption', sg.l100),
            }))}
            formatAxis={(v) => f.n(v, 0)}
            formatValue={(v) => (v === null ? '–' : `${f.n(v, 1)} ${f.consumptionUnit}`)}
          />
        </Card>
      ) : (
        <Insight icon="tachometer" text={t('stats.consumptionNeed')} />
      )}
      <Row>
        <StatTile size="sm" label={t('stats.avgConsumption')} value={f.consumption(cons.avgL100)} sub={cons.segments.length ? t('stats.fromSegments', { count: cons.segments.length }) : null} />
        <StatTile size="sm" label={t('stats.costPerKm')} value={f.costPerKm(cons.costPerKm)} sub={cons.costPerKm ? t('stats.per100', { value: f.money((cons.costPerKm ?? 0) * 100) }) : null} />
        <StatTile size="sm" label={t('stats.best')} value={f.consumption(cons.best?.l100)} sub={cons.best ? `${f.date(cons.best.fromDate, false)} – ${f.date(cons.best.date)}` : null} accent={colors.positive} icon="leaf" />
        <StatTile size="sm" label={t('stats.worst')} value={f.consumption(cons.worst?.l100)} sub={cons.worst ? `${f.date(cons.worst.fromDate, false)} – ${f.date(cons.worst.date)}` : null} accent={colors.negative} icon="fire" />
        <StatTile size="sm" label={t('stats.kmMonth')} value={f.distance(s.kmPerMonth)} sub={s.kmPerMonth ? t('stats.kmYear', { value: f.distance((s.kmPerMonth ?? 0) * 12) }) : null} />
        <StatTile size="sm" label={t('stats.kmBetween')} value={f.distance(s.avgKmBetween)} sub={t('stats.perFill')} />
      </Row>
    </Section>
  );

  const habits = (
    <Section n="04" title={t('stats.sec.habits')} caption={t('stats.sec.habitsCaption')} delay={180}>
      {topWd !== null && (
        <Insight
          tone="tint"
          icon="calendar-check-o"
          text={
            topDp !== null && s.dayparts.withTime >= 3
              ? t('stats.habitSentence', { day: weekdayIn[topWd], part: dayparts[topDp].toLowerCase() })
              : t('stats.habitSentenceDay', { day: weekdayIn[topWd] })
          }
        />
      )}
      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: spacing.md }}>
        <Card style={{ flex: 1, gap: spacing.md }}>
          <AppText variant="label" tone="muted">
            {t('stats.byWeekday')}
          </AppText>
          <DistributionBars labels={WEEKDAYS_SHORT[f.lang]} values={s.weekday.counts} highlight={topWd} format={(v) => (v ? `${v}×` : '·')} />
        </Card>
        <Card style={{ flex: 1, gap: spacing.md }}>
          <AppText variant="label" tone="muted">
            {t('stats.byDaypart')}
          </AppText>
          {s.dayparts.withTime > 0 ? (
            <DistributionBars labels={t('stats.daypartsShort', { returnObjects: true }) as string[]} values={s.dayparts.counts} highlight={topDp} format={(v) => (v ? `${v}×` : '·')} />
          ) : (
            <AppText tone="secondary">{t('stats.noTimes')}</AppText>
          )}
          {s.topHour !== null && (
            <AppText variant="caption" tone="secondary">
              {t('stats.topHour', { from: `${s.topHour}:00`, to: `${s.topHour + 1}:00` })}
            </AppText>
          )}
        </Card>
      </View>
      <Row>
        <StatTile size="sm" label={t('stats.interval')} value={s.avgIntervalDays ? `${f.n(s.avgIntervalDays, 1)} ${daysWord(Math.round(s.avgIntervalDays))}` : '–'} sub={s.medianIntervalDays !== null ? t('stats.median', { value: f.n(s.medianIntervalDays, 0) }) : null} />
        <StatTile size="sm" label={t('stats.longestGap')} value={s.longestGap ? `${s.longestGap.days} ${daysWord(s.longestGap.days)}` : '–'} sub={s.longestGap ? `${f.date(s.longestGap.from, false)} – ${f.date(s.longestGap.to)}` : null} />
        <StatTile size="sm" label={t('stats.shortestGap')} value={s.shortestGap ? `${s.shortestGap.days} ${daysWord(s.shortestGap.days)}` : '–'} sub={s.shortestGap ? `${f.date(s.shortestGap.from, false)} – ${f.date(s.shortestGap.to)}` : null} />
        <StatTile size="sm" label={t('stats.busiestMonth')} value={s.busiestMonth ? `${s.busiestMonth.count}×` : '–'} sub={s.busiestMonth ? f.month(s.busiestMonth.key) : null} />
      </Row>
    </Section>
  );

  const top = s.stations.slice(0, 6);
  const stations = (
    <Section n="05" title={t('stats.sec.stations')} caption={t('stats.sec.stationsCaption', { count: s.stations.length })} delay={220}>
      {top.length ? (
        <Card>
          <RankList
            rows={top.map((st) => ({
              key: st.key,
              title: st.name,
              right: `${st.count}×`,
              value: st.count,
              sub: `${f.money(st.totalCost)} · ø ${f.price(st.avgPrice)} · ${f.percent(st.share, false)}`,
            }))}
          />
        </Card>
      ) : (
        <Insight icon="map-marker" text={t('stats.noStations')} />
      )}
      <Row>
        <StatTile size="sm" label={t('stats.cheapestStation')} value={s.cheapestStation?.name ?? '–'} sub={s.cheapestStation ? `ø ${f.price(s.cheapestStation.avgPrice)} · ${s.cheapestStation.count}×` : null} accent={colors.positive} icon="thumbs-o-up" />
        <StatTile size="sm" label={t('stats.priciestStation')} value={s.priciestStation?.name ?? '–'} sub={s.priciestStation ? `ø ${f.price(s.priciestStation.avgPrice)} · ${s.priciestStation.count}×` : null} accent={colors.negative} icon="thumbs-o-down" />
      </Row>
      {s.potentialSavings !== null && s.potentialSavings > 1 && s.cheapestStation && (
        <Insight icon="lightbulb-o" tone="tint" text={t('stats.savings', { station: s.cheapestStation.name, value: f.money(s.potentialSavings) })} />
      )}
    </Section>
  );

  const tank = (
    <Section n="06" title={t('stats.sec.tank')} caption={t('stats.sec.tankCaption')} delay={260}>
      <Row>
        <StatTile size="sm" label={t('stats.avgFill')} value={f.volume(s.avgLiters)} sub={t('stats.avgPerFill', { value: f.money(s.avgCost) })} />
        <StatTile size="sm" label={t('stats.typicalFill')} value={f.volume(s.medianLiters)} sub={t('stats.medianNote')} />
        <StatTile size="sm" label={t('stats.maxFill')} value={f.volume(s.maxLiters)} sub={s.biggestFill ? f.date(s.biggestFill.date) : null} />
        <StatTile size="sm" label={t('stats.tankSize')} value={s.estimatedTank ? `~${f.volume(s.estimatedTank, 0)}` : '–'} sub={t('stats.tankNote')} />
      </Row>
    </Section>
  );

  const recs: { label: string; value: string; sub?: string | null }[] = [];
  if (s.mostExpensiveFill) recs.push({ label: t('stats.rec.mostExpensive'), value: f.money(s.mostExpensiveFill.cost), sub: `${f.date(s.mostExpensiveFill.date)} · ${s.mostExpensiveFill.station ?? '—'}` });
  if (s.biggestFill) recs.push({ label: t('stats.rec.biggest'), value: f.volume(s.biggestFill.liters), sub: `${f.date(s.biggestFill.date)} · ${s.biggestFill.station ?? '—'}` });
  if (s.smallestFill) recs.push({ label: t('stats.rec.smallest'), value: f.volume(s.smallestFill.liters), sub: `${f.date(s.smallestFill.date)} · ${s.smallestFill.station ?? '—'}` });
  if (s.cheapestFill) recs.push({ label: t('stats.rec.cheapest'), value: f.price(s.cheapestFill.price), sub: `${f.date(s.cheapestFill.date)} · ${s.cheapestFill.station ?? '—'}` });
  if (s.maxPrice) recs.push({ label: t('stats.rec.priciest'), value: f.price(s.maxPrice.value), sub: `${f.date(s.maxPrice.date)} · ${s.maxPrice.station ?? '—'}` });
  if (s.longestGap) recs.push({ label: t('stats.rec.longestGap'), value: `${s.longestGap.days} ${daysWord(s.longestGap.days)}`, sub: `${f.date(s.longestGap.from)} → ${f.date(s.longestGap.to)}` });
  if (s.firstDate) recs.push({ label: t('stats.rec.tracking'), value: `${s.daysTracked} ${daysWord(s.daysTracked)}`, sub: t('stats.rec.since', { date: f.date(s.firstDate) }) });

  const records = (
    <Section n="07" title={t('stats.sec.records')} delay={300}>
      <Card style={{ paddingVertical: spacing.xs }}>
        {recs.map((r, i) => (
          <RecordRow key={r.label} {...r} last={i === recs.length - 1} />
        ))}
      </Card>
      {cons.totalKm > 1000 && (
        <Insight icon="globe" text={t('stats.funEarth', { times: f.n(cons.totalKm / 40075, 2), liters: f.volume(s.totalLiters, 0), count: s.count })} />
      )}
    </Section>
  );

  return (
    <Screen
      title={t('nav.stats')}
      subtitle={t('stats.subtitle', { count: s.count, times: timesWord(s.count) })}
      refreshing={refreshing}
      onRefresh={() => refresh()}
    >
      <View style={{ gap: spacing.lg }}>
        {filters}
        {summary}
        {isWide ? (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.xl }}>
              <View style={{ flex: 1 }}>{spend}</View>
              <View style={{ flex: 1 }}>{price}</View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.xl }}>
              <View style={{ flex: 1 }}>{consumption}</View>
              <View style={{ flex: 1 }}>{stations}</View>
            </View>
            {habits}
            <View style={{ flexDirection: 'row', gap: spacing.xl }}>
              <View style={{ flex: 1 }}>{tank}</View>
              <View style={{ flex: 1 }}>{records}</View>
            </View>
          </>
        ) : (
          <>
            {spend}
            {price}
            {consumption}
            {habits}
            {stations}
            {tank}
            {records}
          </>
        )}
      </View>
    </Screen>
  );
}
