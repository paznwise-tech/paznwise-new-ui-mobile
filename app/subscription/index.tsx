import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { usePlans, useMySubscription, useSubscribe, useCancelSubscription } from '@/hooks/useSubscription';
import { LIMIT_LABELS, type BillingCycle, type SubscriptionPlan } from '@/services/subscriptionService';
import { useUser } from '@/context/AppContext';

function limitText(n: number): string {
  // The server uses a number for every quota, so "unlimited" is expressed as
  // a very large value rather than null.
  return n >= 9999 ? 'Unlimited' : String(n);
}

function PlanCard({
  plan, current, onSelect, busy,
}: {
  plan: SubscriptionPlan;
  current: boolean;
  onSelect: () => void;
  busy: boolean;
}) {
  const perks = [
    `${limitText(plan.postLimit)} posts`,
    `${limitText(plan.productLimit)} products`,
    `${limitText(plan.eventLimit)} events`,
    `${plan.commissionPercent}% commission on sales`,
    plan.artworkRentalEligible ? 'Artwork rentals' : null,
    plan.merchandiseLicensingEligible ? 'Merchandise licensing' : null,
    plan.galleryExhibitionEligible ? 'Gallery exhibitions' : null,
    plan.finePrintsEligible ? 'Fine prints' : null,
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.planCard, current && styles.planCardCurrent]}>
      <View style={styles.planHead}>
        <View>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planTier}>{plan.tier}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.planPrice}>
            {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}`}
          </Text>
          {plan.price > 0 ? (
            <Text style={styles.planCycle}>
              per {plan.billingCycle === 'YEARLY' ? 'year' : 'month'}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.perks}>
        {perks.map(p => (
          <Text key={p} style={styles.perk}>· {p}</Text>
        ))}
      </View>

      {current ? (
        <View style={styles.currentPill}>
          <Text style={styles.currentPillText}>Your current plan</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.selectBtn} onPress={onSelect} disabled={busy}>
          <Text style={styles.selectText}>{busy ? 'Please wait…' : 'Choose this plan'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Subscription() {
  const { status } = useUser();
  const signedIn = status === 'signedIn';

  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: mine, isLoading: mineLoading } = useMySubscription(signedIn);
  const subscribe = useSubscribe();
  const cancel = useCancelSubscription();

  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');

  const visiblePlans = useMemo(
    () => plans.filter(p => p.price === 0 || p.billingCycle === cycle),
    [plans, cycle],
  );

  const currentName = mine?.subscription?.planName;

  const handleSelect = useCallback((plan: SubscriptionPlan) => {
    if (!signedIn) {
      router.push('/(auth)/login');
      return;
    }
    Alert.alert(
      `Switch to ${plan.name}?`,
      plan.price === 0
        ? 'You can change plan again at any time.'
        : `₹${plan.price.toLocaleString('en-IN')} per ${plan.billingCycle === 'YEARLY' ? 'year' : 'month'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await subscribe.mutateAsync({ planId: plan.id, paymentMethod: 'UPI' });
              Alert.alert('Plan updated', `You are now on ${plan.name}.`);
            } catch (e: any) {
              Alert.alert('Could not change plan', e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  }, [signedIn, subscribe]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel subscription', 'You will drop back to the free plan at the end of your cycle.', [
      { text: 'Keep plan', style: 'cancel' },
      {
        text: 'Cancel plan',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel.mutateAsync();
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }, [cancel]);

  const loading = plansLoading || (signedIn && mineLoading);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Plans</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}>
          {/* Current usage first: what someone wants to know before choosing
              is how close they are to their existing limits. */}
          {mine?.limits && (
            <>
              <Text style={styles.sectionTitle}>Your usage</Text>
              <View style={styles.usageCard}>
                <Text style={styles.usagePlan}>{mine.subscription.planName}</Text>
                <Text style={styles.usageStatus}>
                  {mine.subscription.status}
                  {mine.subscription.endDate
                    ? ` · renews ${new Date(mine.subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    : ''}
                </Text>

                {LIMIT_LABELS.map(({ key, label }) => {
                  const meter = mine.limits[key];
                  if (!meter) return null;
                  const pct = meter.limit > 0 ? Math.min(100, (meter.used / meter.limit) * 100) : 0;
                  const atLimit = meter.remaining <= 0;
                  return (
                    <View key={key} style={styles.meter}>
                      <View style={styles.meterHead}>
                        <Text style={styles.meterLabel}>{label}</Text>
                        <Text style={[styles.meterValue, atLimit && { color: Colors.error }]}>
                          {meter.used} / {limitText(meter.limit)}
                        </Text>
                      </View>
                      <View style={styles.meterTrack}>
                        <View
                          style={[
                            styles.meterFill,
                            { width: `${pct}%` },
                            atLimit && { backgroundColor: Colors.error },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.cycleRow}>
            {(['MONTHLY', 'YEARLY'] as BillingCycle[]).map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.cycleChip, cycle === c && styles.cycleChipActive]}
                onPress={() => setCycle(c)}
              >
                <Text style={[styles.cycleText, cycle === c && { color: Colors.gold }]}>
                  {c === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {visiblePlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={plan.name === currentName}
              onSelect={() => handleSelect(plan)}
              busy={subscribe.isPending}
            />
          ))}

          {mine && mine.subscription.price > 0 && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancel.isPending}>
              <Text style={styles.cancelText}>
                {cancel.isPending ? 'Cancelling…' : 'Cancel my subscription'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { ...Typography.label, fontSize: 10, color: Colors.gold, marginBottom: 6 },
  usageCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  usagePlan: { ...Typography.heading, fontSize: 18 },
  usageStatus: { ...Typography.caption, fontSize: 12, marginBottom: Spacing.md },
  meter: { marginTop: Spacing.sm },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  meterLabel: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  meterValue: { ...Typography.bodySemibold, fontSize: 12 },
  meterTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: Colors.gold },

  cycleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  cycleChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  cycleChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  cycleText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },

  planCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  planCardCurrent: { borderColor: Colors.gold },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { ...Typography.heading, fontSize: 18 },
  planTier: { ...Typography.label, fontSize: 9, color: Colors.gold, marginTop: 2 },
  planPrice: { ...Typography.display, fontSize: 22, color: Colors.gold },
  planCycle: { ...Typography.caption, fontSize: 11 },
  perks: { marginTop: Spacing.md, gap: 3 },
  perk: { ...Typography.body, fontSize: 13, color: Colors.creamDim },

  selectBtn: {
    marginTop: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.gold + '66', borderRadius: Radius.md,
  },
  selectText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  currentPill: {
    marginTop: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center',
    borderRadius: Radius.md, backgroundColor: Colors.gold + '18',
  },
  currentPillText: { ...Typography.label, fontSize: 10, color: Colors.gold },

  cancelBtn: { marginTop: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  cancelText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.error },
});
