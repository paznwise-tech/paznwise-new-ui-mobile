import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { orderService } from '@/services/orderService';
import { resolveImageUrl, DEFAULT_IMAGE } from '@/utils/imageUrl';
import type { Order, OrderItem } from '@/types';

// ─── Status vocabulary ────────────────────────────────────────────────────────
//
// The API returns screaming-snake enums. Showing them raw ("OUT_FOR_DELIVERY")
// reads as a database field, so every status is mapped to a label, a semantic
// colour from the theme, and its position on the fulfilment rail.

const STEPS = ['Confirmed', 'Packed', 'Shipped', 'Delivered'] as const;

type StatusMeta = {
  label: string;
  color: string;
  /** Index into STEPS, or null for orders that never reach the rail. */
  step: number | null;
  terminal?: 'good' | 'bad';
};

const STATUS: Record<string, StatusMeta> = {
  PENDING:          { label: 'Order placed',    color: Colors.warning, step: 0 },
  CONFIRMED:        { label: 'Confirmed',       color: Colors.warning, step: 0 },
  PROCESSING:       { label: 'Being packed',    color: Colors.warning, step: 1 },
  SHIPPED:          { label: 'Shipped',         color: '#5AA9E6',      step: 2 },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', color: '#5AA9E6',     step: 2 },
  DELIVERED:        { label: 'Delivered',       color: Colors.success, step: 3, terminal: 'good' },
  COMPLETED:        { label: 'Completed',       color: Colors.success, step: 3, terminal: 'good' },
  CANCELLED:        { label: 'Cancelled',       color: Colors.error,   step: null, terminal: 'bad' },
  REJECTED:         { label: 'Rejected',        color: Colors.error,   step: null, terminal: 'bad' },
  FAILED:           { label: 'Payment failed',  color: Colors.error,   step: null, terminal: 'bad' },
};

const statusMeta = (raw?: string): StatusMeta =>
  STATUS[String(raw ?? '').toUpperCase()] ?? { label: 'Processing', color: Colors.warning, step: 0 };

const STATUS_GROUPS: Record<string, string[]> = {
  Active: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'],
  Delivered: ['DELIVERED', 'COMPLETED'],
  Cancelled: ['CANCELLED', 'REJECTED', 'FAILED'],
};

const FILTERS = ['All', 'Active', 'Delivered', 'Cancelled'] as const;
type Filter = typeof FILTERS[number];

// ─── Pieces ───────────────────────────────────────────────────────────────────

/**
 * Fulfilment rail.
 *
 * An orders list is opened to answer "where is my order", which a status
 * word alone does not settle. Four dots place the order in the journey at a
 * glance, without opening the detail screen.
 */
function ProgressRail({ step }: { step: number }) {
  return (
    <View style={styles.rail}>
      {STEPS.map((label, i) => {
        const done = i <= step;
        const isCurrent = i === step;
        return (
          <View key={label} style={styles.railCol}>
            <View style={styles.railTrack}>
              {/* Connectors are drawn either side of the dot so the line
                  never overshoots the first and last markers. */}
              <View style={[styles.railLine, { opacity: i === 0 ? 0 : 1 }, done && styles.railLineDone]} />
              <View style={[styles.dot, done && styles.dotDone, isCurrent && styles.dotCurrent]} />
              <View
                style={[
                  styles.railLine,
                  { opacity: i === STEPS.length - 1 ? 0 : 1 },
                  i < step && styles.railLineDone,
                ]}
              />
            </View>
            <Text style={[styles.railLabel, done && styles.railLabelDone]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Overlapping thumbnails, so a multi-item order looks like one at a glance. */
function ThumbStack({ items }: { items: OrderItem[] }) {
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;

  const uriFor = (it: OrderItem) =>
    resolveImageUrl(
      it?.productImage ??
        it?.imageUrl ??
        it?.product?.productImages?.[0] ??
        it?.product?.images?.[0],
    ) || DEFAULT_IMAGE;

  if (shown.length === 0) {
    return <View style={[styles.thumb, styles.thumbEmpty]} />;
  }

  return (
    <View style={styles.stack}>
      {shown.map((it, i) => (
        <Image
          key={String(it?.id ?? i)}
          source={{ uri: uriFor(it) }}
          style={[styles.thumb, i > 0 && { marginLeft: -18 }, { zIndex: shown.length - i }]}
          contentFit="cover"
          transition={180}
        />
      ))}
      {extra > 0 && (
        <View style={[styles.thumb, styles.thumbMore, { marginLeft: -18 }]}>
          <Text style={styles.thumbMoreText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

function CardSkeleton() {
  return (
    <View style={[styles.card, { opacity: 0.5 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.skel, { width: 96, height: 20, borderRadius: Radius.full }]} />
        <View style={[styles.skel, { width: 64, height: 12 }]} />
      </View>
      <View style={styles.cardBody}>
        <View style={[styles.skel, styles.thumb]} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[styles.skel, { width: '75%', height: 14 }]} />
          <View style={[styles.skel, { width: '40%', height: 11 }]} />
        </View>
      </View>
      <View style={styles.cardFoot}>
        <View style={[styles.skel, { width: 110, height: 11 }]} />
        <View style={[styles.skel, { width: 70, height: 16 }]} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyOrdersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>('All');

  const fetchOrders = useCallback(async () => {
    try {
      setOrders(await orderService.getMyOrders());
    } catch (err: any) {
      console.warn('[MyOrders] Error fetching orders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  /** Counts sit on the chips so the tabs say what is behind them. */
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.length };
    for (const name of Object.keys(STATUS_GROUPS)) {
      c[name] = orders.filter(o =>
        STATUS_GROUPS[name].includes(String(o.status).toUpperCase()),
      ).length;
    }
    return c;
  }, [orders]);

  // Filtering is local: the list endpoint returns the buyer's orders in one
  // page, and the set is small enough that a round trip per tab is not worth
  // it. If pagination is added this must move to the `status` query param.
  const visible = useMemo(
    () =>
      filter === 'All'
        ? orders
        : orders.filter(o => STATUS_GROUPS[filter]?.includes(String(o.status).toUpperCase())),
    [orders, filter],
  );

  const renderOrder = useCallback(({ item }: { item: Order }) => {
    const items: OrderItem[] = (item.products || item.items || item.orderItems || []) as OrderItem[];
    const first = items[0];
    const meta = statusMeta(item.status);

    const title =
      first?.productName || first?.title || first?.product?.title || 'Purchased artwork';

    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const unitCount = items.reduce((n, it) => n + (it?.quantity ?? 1), 0);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/orders/[id]' as any,
            params: { id: (item.orderId || item.id).toString() },
          })
        }
        activeOpacity={0.85}
      >
        {/* Status first — it is what the screen is opened to find out. */}
        <View style={styles.cardTop}>
          <View style={[styles.pill, { borderColor: meta.color, backgroundColor: meta.color + '1A' }]}>
            <View style={[styles.pillDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        <View style={styles.cardBody}>
          <ThumbStack items={items} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.sub}>
              {items.length > 1
                ? `${items.length} artworks · ${unitCount} item${unitCount === 1 ? '' : 's'}`
                : `${unitCount} item${unitCount === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>

        {meta.step !== null && meta.terminal !== 'good' && <ProgressRail step={meta.step} />}

        <View style={styles.cardFoot}>
          <Text style={styles.ref} numberOfLines={1}>
            #{item.invoiceNumber || item.orderId || item.id}
          </Text>
          <Text style={styles.total}>
            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  /** The empty state depends on the tab — "no orders at all" is only true on All. */
  const empty = useMemo(() => {
    if (orders.length === 0) {
      return {
        title: 'No orders yet',
        body: 'When you buy original artworks or merchandise, your orders and their delivery status appear here.',
        cta: true,
      };
    }
    return {
      title: `Nothing ${filter.toLowerCase()}`,
      body:
        filter === 'Active'
          ? 'You have no orders in transit right now.'
          : filter === 'Delivered'
            ? 'None of your orders have been delivered yet.'
            : 'You have not cancelled any orders.',
      cta: false,
    };
  }, [orders.length, filter]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={FILTERS as unknown as Filter[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        keyExtractor={f => f}
        style={{ flexGrow: 0 }}
        renderItem={({ item: f }) => {
          const active = filter === f;
          const n = counts[f] ?? 0;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
              {n > 0 && (
                <View style={[styles.chipCount, active && styles.chipCountActive]}>
                  <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{n}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={styles.listContent}>
          {[0, 1, 2].map(i => <CardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => (item.orderId || item.id).toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyMark}>◈</Text>
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              <Text style={styles.emptySub}>{empty.body}</Text>
              {empty.cta && (
                <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)/browse')}>
                  <Text style={styles.browseBtnText}>Explore marketplace</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText: { fontSize: 20, color: Colors.cream },
  headerTitle: { ...Typography.display, fontSize: 18, color: Colors.cream },

  // Filters
  filterList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '18' },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  chipTextActive: { color: Colors.gold },
  chipCount: {
    minWidth: 18, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: Radius.full, backgroundColor: Colors.bgInput, alignItems: 'center',
  },
  chipCountActive: { backgroundColor: Colors.gold },
  chipCountText: { ...Typography.caption, fontSize: 10, color: Colors.creamDim },
  chipCountTextActive: { color: Colors.bg, fontWeight: '700' },

  listContent: { padding: Spacing.md, paddingBottom: 40, gap: Spacing.md },

  // Card
  card: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { ...Typography.label, fontSize: 10, letterSpacing: 0.6 },
  date: { ...Typography.caption, fontSize: 11, color: Colors.creamDim },

  cardBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stack: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 54, height: 54, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgInput,
  },
  thumbEmpty: { opacity: 0.6 },
  thumbMore: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgElevated },
  thumbMoreText: { ...Typography.bodyBold, fontSize: 13, color: Colors.gold },

  title: { ...Typography.bodyBold, fontSize: 14, color: Colors.cream },
  sub: { ...Typography.caption, fontSize: 11, color: Colors.creamDim, marginTop: 3 },

  // Fulfilment rail
  rail: {
    flexDirection: 'row', marginTop: 2,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  railCol: { flex: 1, alignItems: 'center' },
  railTrack: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  railLine: { flex: 1, height: 2, backgroundColor: Colors.border },
  railLineDone: { backgroundColor: Colors.gold },
  dot: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: Colors.bgCard, borderWidth: 2, borderColor: Colors.border,
  },
  dotDone: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  dotCurrent: {
    backgroundColor: Colors.gold, borderColor: Colors.goldLight,
    width: 13, height: 13, borderRadius: 7,
  },
  railLabel: { ...Typography.caption, fontSize: 9, color: Colors.creamFaint, marginTop: 5 },
  railLabelDone: { color: Colors.creamDim },

  cardFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  ref: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint, flex: 1 },
  total: { ...Typography.display, fontSize: 17, color: Colors.gold },

  // Skeleton
  skel: { backgroundColor: Colors.bgInput, borderRadius: Radius.sm },

  // Empty
  emptyBox: { paddingVertical: 56, alignItems: 'center', paddingHorizontal: Spacing.lg },
  emptyMark: { fontSize: 30, color: Colors.gold, opacity: 0.5, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.display, fontSize: 20, color: Colors.cream, marginBottom: 6 },
  emptySub: {
    ...Typography.body, fontSize: 13, color: Colors.creamDim,
    textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 19, maxWidth: 300,
  },
  browseBtn: {
    backgroundColor: Colors.gold, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
  },
  browseBtnText: { ...Typography.bodyBold, fontSize: 14, color: Colors.bg },
});
