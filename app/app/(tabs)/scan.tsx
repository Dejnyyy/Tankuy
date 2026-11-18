import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData, type EntryInput } from '@/context/DataContext';
import { useFormat } from '@/hooks/useFormat';
import api, { type ReceiptScanResult } from '@/services/api';
import { AppText, Button, Card, PressableScale, Screen } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EntryForm, emptyForm, type FieldKey, type FormState } from '@/components/EntryForm';
import { elevation, radii, spacing } from '@/constants/Theme';
import { haptics } from '@/lib/haptics';
import { saveWithDuplicateCheck } from '@/lib/entryHelpers';
import { stationStats, toNum } from '@/lib/stats';

type Phase = 'idle' | 'scanning' | 'review' | 'saved' | 'error';

interface Picked {
  uri: string;
  mime: string;
  base64?: string;
  file?: any;
}

/** Map the API's parsed receipt onto the form + note which fields AI filled. */
function fromScan(res: ReceiptScanResult, base: FormState) {
  const p = (res?.parsed ?? {}) as ReceiptScanResult['parsed'];
  const ai = new Set<FieldKey>();
  const missing = new Set<FieldKey>();
  const form = { ...base };
  const num = (a: unknown, b?: unknown) => toNum(a) ?? toNum(b);
  const liters = num(p.totalUnits, p.totalLiters);
  const price = num(p.pricePerUnit, p.pricePerLiter);
  let cost = toNum(p.totalCost);
  if (p.stationName) {
    form.station = String(p.stationName);
    ai.add('station');
  } else missing.add('station');
  if (p.date && /^\d{4}-\d{2}-\d{2}/.test(String(p.date))) {
    form.date = String(p.date).slice(0, 10);
    ai.add('date');
  } else missing.add('date');
  if (p.time && /^\d{1,2}:\d{2}/.test(String(p.time))) {
    form.time = String(p.time).slice(0, 5);
    ai.add('time');
  }
  if (!cost && liters && price) cost = +(liters * price).toFixed(2);
  if (liters) {
    form.liters = String(liters);
    ai.add('liters');
  } else missing.add('liters');
  if (price) {
    form.price = String(price);
    ai.add('price');
  } else missing.add('price');
  if (cost) {
    form.cost = String(cost);
    ai.add('cost');
  } else missing.add('cost');
  return { form, ai, missing, readable: ai.size >= 2 };
}

function ScanningView({ uri, step }: { uri: string; step: string }) {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  const [h, setH] = useState(320);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })), -1);
  }, [y]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (h - 4) }] }));
  const glow = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (h - 60) }] }));
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', gap: spacing.xl, width: '100%' }}>
      <View
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={{ width: '78%', maxWidth: 300, aspectRatio: 0.72, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.sunken, borderWidth: 1, borderColor: colors.border }}
      >
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }} />
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 60, backgroundColor: colors.tint, opacity: 0.18 }, glow]} />
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: colors.tint }, line]} />
        {/* corner brackets */}
        {[
          { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((s, i) => (
          <View key={i} style={[{ position: 'absolute', width: 26, height: 26, borderColor: '#fff', borderRadius: 4 }, s]} />
        ))}
      </View>
      <Animated.View key={step} entering={FadeInUp.duration(300)} exiting={FadeOut.duration(150)} style={{ alignItems: 'center', gap: 4 }}>
        <AppText variant="heading">{step}</AppText>
      </Animated.View>
    </Animated.View>
  );
}

function SuccessMark() {
  const { colors } = useTheme();
  const ring = useSharedValue(0.6);
  useEffect(() => {
    ring.value = withDelay(120, withSpring(1, { damping: 9, stiffness: 120 }));
  }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }], opacity: 2 - ring.value * 1.4 }));
  return (
    <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: colors.positiveSoft }, ringStyle]} />
      <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.positive, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="check" size={38} color="#fff" />
      </Animated.View>
    </View>
  );
}

export default function ScanScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const { entries, vehicles, addEntry } = useData();
  const { mode, ts } = useLocalSearchParams<{ mode?: string; ts?: string }>();
  const [phase, setPhase] = useState<Phase>('idle');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [scan, setScan] = useState<ReturnType<typeof fromScan> | null>(null);
  const [saved, setSaved] = useState<EntryInput | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const token = useRef(0);
  const stations = useMemo(() => stationStats(entries), [entries]);
  const steps = t('scan.steps', { returnObjects: true }) as string[];

  // Legacy deep link: /scan?mode=manual opens the manual form.
  useEffect(() => {
    if (mode === 'manual') router.replace('/entry');
  }, [mode, ts]);

  useEffect(() => {
    if (phase !== 'scanning') return;
    setStepIdx(0);
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, steps.length - 1)), 1700);
    return () => clearInterval(id);
  }, [phase, steps.length]);

  const baseForm = () => emptyForm(entries.length ? entries[entries.length - 1].vehicleId ?? vehicles[0]?.id ?? null : vehicles[0]?.id ?? null);

  const run = async (p: Picked) => {
    const my = ++token.current;
    setPicked(p);
    setPhase('scanning');
    setErrorMsg(null);
    haptics.light();
    try {
      const res = await api.scanReceipt(p.base64 ?? '', p.mime, p.uri, p.file);
      if (my !== token.current) return;
      const mapped = fromScan(res, baseForm());
      setResult(res);
      setScan(mapped);
      if (!mapped.readable) {
        haptics.warning();
        setErrorMsg(t('scan.unreadable'));
        setPhase('error');
        return;
      }
      haptics.success();
      setPhase('review');
    } catch (e: any) {
      if (my !== token.current) return;
      haptics.error();
      setErrorMsg(String(e?.message ?? '').includes('401') ? t('scan.errAuth') : t('scan.errNetwork'));
      setPhase('error');
    }
  };

  // Coming back to the tab after a successful save starts fresh.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useFocusEffect(
    useCallback(() => {
      if (phaseRef.current === 'saved') reset();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const pickWeb = (capture: boolean) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) (input as any).capture = 'environment';
    input.onchange = (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;
      run({ uri: URL.createObjectURL(file), mime: file.type || 'image/jpeg', file });
    };
    input.click();
  };

  const pickNative = async (camera: boolean) => {
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          toast(t('scan.noCamera'), 'error');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      run({ uri: a.uri, mime: a.mimeType || 'image/jpeg' });
    } catch {
      toast(t('scan.errNetwork'), 'error');
    }
  };

  const pick = (camera: boolean) => (Platform.OS === 'web' ? pickWeb(camera) : pickNative(camera));

  const reset = () => {
    token.current++;
    setPhase('idle');
    setPicked(null);
    setResult(null);
    setScan(null);
    setSaved(null);
  };

  const onSubmit = async (data: EntryInput) => {
    try {
      const ok = await saveWithDuplicateCheck(addEntry, data, t);
      if (!ok) return;
      haptics.success();
      setSaved(data);
      setPhase('saved');
    } catch {
      haptics.error();
      toast(t('entry.saveError'), 'error');
    }
  };

  // ── Phases ──
  if (phase === 'scanning' && picked) {
    return (
      <Screen title={t('scan.title')} overline={t('scan.scanningOverline')}>
        <View style={{ paddingTop: spacing.lg, gap: spacing.xl, alignItems: 'center', width: '100%' }}>
          <ScanningView uri={picked.uri} step={steps[stepIdx] ?? ''} />
          <AppText tone="secondary" align="center" style={{ maxWidth: 300 }}>
            {t('scan.scanningHint')}
          </AppText>
          <Button title={t('common.cancel')} variant="ghost" onPress={reset} />
        </View>
      </Screen>
    );
  }

  if (phase === 'review' && scan) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          title={t('scan.reviewTitle')}
          overline={t('scan.reviewOverline', { count: scan.ai.size })}
          right={
            <PressableScale onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }}>
              <FontAwesome name="refresh" size={13} color={colors.textSecondary} />
              <AppText variant="captionBold" tone="secondary">
                {t('scan.rescan')}
              </AppText>
            </PressableScale>
          }
        >
          <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', gap: spacing.xl }}>
            <Animated.View entering={FadeInDown.duration(350)}>
              <Card tone="sunken" style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                {picked ? (
                  <Image source={{ uri: picked.uri }} style={{ width: 52, height: 68, borderRadius: radii.sm, backgroundColor: colors.sunken }} />
                ) : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyBold">{t('scan.reviewBanner')}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {scan.missing.size ? t('scan.reviewMissing') : t('scan.reviewAll')}
                  </AppText>
                </View>
              </Card>
            </Animated.View>
            <EntryForm
              initial={scan.form}
              aiFields={scan.ai}
              missingFields={scan.missing}
              vehicles={vehicles}
              stations={stations}
              entries={entries}
              receiptImageUrl={result?.imageUrl}
              submitLabel={t('entry.save')}
              onSubmit={onSubmit}
            />
          </View>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  if (phase === 'saved' && saved) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.xl, paddingTop: spacing.huge, maxWidth: 440, width: '100%', alignSelf: 'center' }}>
          <SuccessMark />
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ alignItems: 'center', gap: 6 }}>
            <AppText variant="title" align="center">
              {t('scan.savedTitle')}
            </AppText>
            <AppText tone="secondary" align="center">
              {t('scan.savedSub')}
            </AppText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ alignSelf: 'stretch' }}>
            <Card style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <AppText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                  {saved.stationName ?? t('entry.unknownStation')}
                </AppText>
                <AppText variant="mono" tone="muted">
                  {f.date(saved.date)}
                </AppText>
              </View>
              <AppText variant="hero" style={{ fontSize: 38, lineHeight: 42 }}>
                {f.money(saved.totalCost)}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <AppText tone="secondary">{f.volume(saved.totalLiters)}</AppText>
                <AppText tone="secondary">{f.price(saved.pricePerLiter)}</AppText>
              </View>
            </Card>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={{ alignSelf: 'stretch', gap: spacing.sm }}>
            <Button title={t('scan.done')} size="lg" onPress={() => { reset(); router.navigate('/'); }} />
            <Button title={t('scan.another')} size="lg" variant="secondary" icon="camera" onPress={reset} />
          </Animated.View>
        </View>
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen title={t('scan.title')}>
        <Animated.View entering={FadeInDown.duration(380)} style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <Card style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxxl }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.negativeSoft, alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="exclamation" size={30} color={colors.negative} />
            </View>
            <AppText variant="heading" align="center">
              {t('scan.errTitle')}
            </AppText>
            <AppText tone="secondary" align="center">
              {errorMsg}
            </AppText>
            <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
              {picked && <Button title={t('scan.retry')} icon="refresh" variant="accent" size="lg" onPress={() => run(picked)} />}
              <Button title={t('scan.newPhoto')} icon="camera" variant="secondary" size="lg" onPress={() => pick(true)} />
              <Button
                title={t('scan.fillManually')}
                variant="ghost"
                icon="pencil"
                onPress={() => {
                  // Keep whatever was read (and the uploaded receipt) and let the user finish.
                  const mapped = scan ?? { form: baseForm(), ai: new Set<FieldKey>(), missing: new Set<FieldKey>(), readable: false };
                  setScan(mapped);
                  setPhase('review');
                }}
              />
            </View>
          </Card>
        </Animated.View>
      </Screen>
    );
  }

  // idle
  const tips = t('scan.tips', { returnObjects: true }) as string[];
  return (
    <Screen title={t('scan.title')} subtitle={t('scan.subtitle')}>
      <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center', gap: spacing.xl }}>
        <Animated.View entering={FadeInDown.duration(420)}>
          <PressableScale onPress={() => pick(true)} haptic="medium" scaleTo={0.985}>
            <View
              style={[
                {
                  borderRadius: radii.xl,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.xxl,
                  alignItems: 'center',
                  gap: spacing.lg,
                  overflow: 'hidden',
                },
                elevation(2, colors.shadow, isDark),
              ]}
            >
              <ReceiptIllustration />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <AppText variant="heading" style={{ fontSize: 20 }}>
                  {t('scan.heroTitle')}
                </AppText>
                <AppText tone="secondary" align="center" style={{ maxWidth: 320 }}>
                  {t('scan.heroText')}
                </AppText>
              </View>
              <View style={{ alignSelf: 'stretch' }}>
                <Button title={t('scan.takePhoto')} icon="camera" variant="accent" size="lg" onPress={() => pick(true)} />
              </View>
            </View>
          </PressableScale>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={t('scan.fromGallery')} icon="image" variant="secondary" onPress={() => pick(false)} style={{ flex: 1 }} />
          <Button title={t('scan.manual')} icon="pencil" variant="secondary" onPress={() => router.push('/entry')} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(160).duration(420)} style={{ gap: spacing.sm }}>
          <AppText variant="label" tone="muted">
            {t('scan.tipsTitle')}
          </AppText>
          {tips.map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <AppText variant="mono" tone="tint">
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <AppText tone="secondary" style={{ flex: 1 }}>
                {tip}
              </AppText>
            </View>
          ))}
        </Animated.View>
      </View>
    </Screen>
  );
}

/** A little receipt that gently floats — sets the tone of the screen. */
function ReceiptIllustration() {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [y]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * y.value }, { rotate: `${-4 + y.value * 2}deg` }] }));
  return (
    <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: colors.tintSoft }} />
      <Animated.View style={[{ width: 92, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, gap: 7 }, float]}>
        <View style={{ height: 6, width: '60%', borderRadius: 3, backgroundColor: colors.text, alignSelf: 'center' }} />
        {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ height: 4, width: `${w * 55}%`, borderRadius: 2, backgroundColor: colors.borderStrong }} />
            <View style={{ height: 4, width: '18%', borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </View>
        ))}
        <View style={{ height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ height: 6, width: '35%', borderRadius: 3, backgroundColor: colors.text }} />
          <View style={{ height: 6, width: '28%', borderRadius: 3, backgroundColor: colors.tint }} />
        </View>
      </Animated.View>
    </View>
  );
}
