import React from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Platform
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api, PortfolioItem } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `€${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPct(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const TYPE_COLORS: Record<string, string> = {
  ETF: "#0A84FF",
  Azione: "#30D158",
  Crypto: "#FF9F0A",
  Obbligazione: "#5E5CE6",
  Altro: "#8E8E93",
};

function PortfolioCard({ item }: { item: PortfolioItem }) {
  const { colors } = useTheme();
  const typeColor = TYPE_COLORS[item.type] ?? "#8E8E93";
  const isPositive = (item.gainLossPercent ?? 0) >= 0;

  return (
    <View style={[styles.portCard, { backgroundColor: colors.card }]}>
      <View style={styles.portCardHeader}>
        <View style={styles.portCardLeft}>
          <View style={[styles.typePill, { backgroundColor: typeColor + "22" }]}>
            <Text style={[styles.typePillText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <Text style={[styles.ticker, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{item.ticker}</Text>
          <Text style={[styles.instName, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.portCardRight}>
          <Text style={[styles.currentValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {formatCurrency(item.currentValue)}
          </Text>
          {item.gainLossPercent !== null && (
            <Text style={[styles.gainPct, { color: isPositive ? "#30D158" : "#FF453A", fontFamily: "Inter_600SemiBold" }]}>
              {formatPct(item.gainLossPercent)}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.portCardSep, { backgroundColor: colors.separator }]} />
      <View style={styles.portCardStats}>
        <View style={styles.portStat}>
          <Text style={[styles.portStatLabel, { color: colors.textSecondary }]}>Quantità</Text>
          <Text style={[styles.portStatValue, { color: colors.text }]}>{item.quantity.toFixed(4)}</Text>
        </View>
        <View style={styles.portStat}>
          <Text style={[styles.portStatLabel, { color: colors.textSecondary }]}>Prezzo corrente</Text>
          <Text style={[styles.portStatValue, { color: colors.text }]}>{formatCurrency(item.currentPrice)}</Text>
        </View>
        <View style={styles.portStat}>
          <Text style={[styles.portStatLabel, { color: colors.textSecondary }]}>Costo totale</Text>
          <Text style={[styles.portStatValue, { color: colors.text }]}>{formatCurrency(item.totalCost)}</Text>
        </View>
        <View style={styles.portStat}>
          <Text style={[styles.portStatLabel, { color: colors.textSecondary }]}>P&L</Text>
          <Text style={[styles.portStatValue, {
            color: (item.gainLoss ?? 0) >= 0 ? "#30D158" : "#FF453A"
          }]}>
            {item.gainLoss !== null ? formatCurrency(item.gainLoss) : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function InvestimentiScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: portfolio, isLoading, refetch } = useQuery({
    queryKey: ["portfolio"],
    queryFn: api.getPortfolio,
  });

  const totalValue = portfolio?.reduce((s, i) => s + (i.currentValue ?? i.totalCost), 0) ?? 0;
  const totalCost = portfolio?.reduce((s, i) => s + i.totalCost, 0) ?? 0;
  const totalGainLoss = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // Group by type
  const byType: Record<string, number> = {};
  portfolio?.forEach(item => {
    const val = item.currentValue ?? item.totalCost;
    byType[item.type] = (byType[item.type] ?? 0) + val;
  });

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 90;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.tint} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Investimenti</Text>
      </View>

      {/* Summary card */}
      {portfolio && portfolio.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: "#1C1C1E" }]}>
          <Text style={styles.summaryLabel}>Valore Portafoglio</Text>
          <Text style={styles.summaryAmount}>€{totalValue.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryGain, { color: totalGainLoss >= 0 ? "#30D158" : "#FF453A" }]}>
              {totalGainLoss >= 0 ? "+" : ""}{formatCurrency(totalGainLoss)} ({formatPct(totalGainPct)})
            </Text>
          </View>
          {/* Type breakdown */}
          <View style={styles.typeBreakdown}>
            {Object.entries(byType).map(([type, val]) => {
              const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
              const color = TYPE_COLORS[type] ?? "#8E8E93";
              return (
                <View key={type} style={styles.typeItem}>
                  <View style={[styles.typeDot, { backgroundColor: color }]} />
                  <Text style={styles.typeLabel}>{type}</Text>
                  <Text style={styles.typePct}>{pct.toFixed(1)}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Portfolio items */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        POSIZIONI APERTE
      </Text>

      {portfolio && portfolio.length > 0 ? (
        portfolio.map(item => <PortfolioCard key={item.instrumentId} item={item} />)
      ) : (
        <View style={{ marginTop: 40 }}>
          <EmptyState
            icon="trending-up"
            title="Nessun investimento"
            subtitle="Aggiungi transazioni finanziarie nella sezione Spese"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28 },
  summaryCard: {
    marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 8,
  },
  summaryLabel: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryAmount: { color: "#FFF", fontSize: 34, fontFamily: "Inter_700Bold", marginTop: 4 },
  summaryRow: { marginTop: 8 },
  summaryGain: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  typeBreakdown: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, gap: 12 },
  typeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  typePct: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 13, letterSpacing: 0.4, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  portCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  portCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  portCardLeft: { flex: 1, gap: 4 },
  portCardRight: { alignItems: "flex-end", gap: 2 },
  typePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typePillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ticker: { fontSize: 22 },
  instName: { fontSize: 13 },
  currentValue: { fontSize: 20 },
  gainPct: { fontSize: 14 },
  portCardSep: { height: 1, marginVertical: 12 },
  portCardStats: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  portStat: { width: "45%" },
  portStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  portStatValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
