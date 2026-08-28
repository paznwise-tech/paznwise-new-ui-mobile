import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { EventSeat } from '@/services/eventService';

interface Props {
  seats: EventSeat[];
  selectedIds: string[];
  onToggle: (seatId: string) => void;
  /** Stops selection growing past what the tier or slot allows. */
  maxSelectable?: number;
}

/**
 * Seat picker.
 *
 * Seats are grouped into rows by the letter prefix of their number (A1, A2,
 * B1 …), which is the convention the seat generator uses. Anything that does
 * not match falls into a trailing group so no seat is silently hidden.
 *
 * LOCKED and BOOKED are both shown as unavailable: a lock held by someone
 * else is not something this user can take, and distinguishing them would
 * only invite retrying a seat that is about to be sold.
 */
export function SeatMap({ seats, selectedIds, onToggle, maxSelectable }: Props) {
  const rows = useMemo(() => {
    const grouped = new Map<string, EventSeat[]>();
    for (const seat of seats) {
      const match = /^([A-Za-z]+)/.exec(seat.seatNumber);
      const key = match ? match[1].toUpperCase() : '#';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(seat);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map(([label, list]) => ({
        label,
        seats: list.sort((x, y) =>
          x.seatNumber.localeCompare(y.seatNumber, undefined, { numeric: true }),
        ),
      }));
  }, [seats]);

  const atLimit = maxSelectable != null && selectedIds.length >= maxSelectable;

  if (seats.length === 0) return null;

  return (
    <View>
      <View style={styles.screen}>
        <Text style={styles.screenText}>STAGE</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {rows.map(row => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              {row.seats.map(seat => {
                const selected = selectedIds.includes(seat.id);
                const unavailable = seat.status !== 'AVAILABLE';
                // A seat at the limit stays tappable if already selected, so
                // the user can always deselect their way out.
                const disabled = unavailable || (atLimit && !selected);

                return (
                  <TouchableOpacity
                    key={seat.id}
                    style={[
                      styles.seat,
                      unavailable && styles.seatTaken,
                      selected && styles.seatSelected,
                      disabled && !unavailable && styles.seatDimmed,
                    ]}
                    onPress={() => onToggle(seat.id)}
                    disabled={disabled}
                    accessibilityLabel={`Seat ${seat.seatNumber}${unavailable ? ', unavailable' : selected ? ', selected' : ''}`}
                  >
                    <Text style={[styles.seatText, selected && styles.seatTextSelected]}>
                      {seat.seatNumber.replace(/^[A-Za-z]+/, '')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.seat]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.seatSelected]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.seatTaken]} />
          <Text style={styles.legendText}>Taken</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: 'center', paddingHorizontal: Spacing.xl, paddingVertical: 6,
    borderRadius: Radius.sm, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.gold + '55', marginBottom: Spacing.lg,
  },
  screenText: { ...Typography.label, fontSize: 9, color: Colors.gold, letterSpacing: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  rowLabel: { ...Typography.caption, fontSize: 11, width: 18 },

  seat: {
    width: 30, height: 30, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  seatSelected: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  seatTaken: { backgroundColor: Colors.border, borderColor: Colors.border, opacity: 0.5 },
  seatDimmed: { opacity: 0.35 },
  seatText: { ...Typography.caption, fontSize: 10, color: Colors.creamDim },
  seatTextSelected: { color: Colors.bg, fontWeight: '700' },

  legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 4 },
  legendText: { ...Typography.caption, fontSize: 11 },
});
