import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, Platform, Dimensions
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, CategoryStat, MonthlyExpense, PortfolioItem } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 64;

function formatCurrency(n: number) {
  return `€${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DonutSlice({ pct, color, offset }: { pct: number; color: string; offset: number }) {
  // Simple bar representation since we don't have SVG
  return null;
}

function CategoryBar({ stat, total }: { stat: CategoryStat; total: number }) {
  const { colors } = useTheme();
  const pct = total > 0 ? (stat.total / total) * 100 : 0;
  const barColor = stat.color ?? "#8E8E93";

  return (
    <View style={styles.catBarRow}>
      <View style={styles.catBarHeader}>
        <View style={styles.catBarLeft}>
          <View style={[styles.catDot, { backgroundColor: barColor }]} />
          <Text style={[styles.catName, { color: colors.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
            {stat.categoryName}
          </Text>
        </View>
        <View style={styles.catBarRight}>
          <Text style={[styles.catAmount, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            {formatCurrency(stat.total)}
          </Text>
          <Text style={[styles.catPct, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {pct.toFixed(1)}%
          </Text>
        </View>
      </View>
      <View style={[styles.catBarBg, { backgroundColor: colors.separator }]}>
        <View style={[styles.catBarFill, { backgroundColor: barColor, width: `${Math.min(pct, 100)}%` }]} />
      </View>
    </View>
  );
}

function MonthBar({ item, maxVal }: { item: MonthlyExpense; maxVal: number }) {
  const { colors } = useTheme();
  const pct = maxVal > 0 ? (item.total / maxVal) : 0;
  const [year, month] = item.month.split("-");
  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const label = monthNames[parseInt(month) - 1];

  return (
    <View style={styles.monthBarItem}>
      <View style={styles.monthBarContainer}>
        <View style={[styles.monthBarFill, {
          backgroundColor: colors.tint,
          height: `${Math.max(pct * 100, 4)}%`,
          opacity: 0.85 + pct * 0.15,
        }]} />
      </View>
      <Text style={[styles.monthBarLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

const TYPE_COLORS: Record<string, string> = {
  ETF: "#0A84FF", Azione: "#30D158", Crypto: "#FF9F0A", Obbligazione: "#5E5CE6", Altro: "#8E8E93",
};

export default function StatisticheScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: catStats, isLoading: catLoad, refetch: refetchCat } = useQuery({
    queryKey: ["expenses-by-category"],
    queryFn: () => api.getExpensesByCategory(),
  });
  const { data: monthlyExp, isLoading: monLoad, refetch: refetchMon } = useQuery({
    queryKey: ["monthly-expenses"],
    queryFn: () => api.getMonthlyExpenses(12),
  });
  const { data: portfolio, isLoading: portLoad, refetch: refetchPort } = useQuery({
    queryKey: ["portfolio"],
    queryFn: api.getPortfolio,
  });

  const isLoading = catLoad || monLoad || portLoad;
  const onRefresh = () => { refetchCat(); refetchMon(); refetchPort(); };

  const totalExpenses = catStats?.reduce((s, c) => s + c.total, 0) ?? 0;
  const maxMonthly = Math.max(...(monthlyExp?.map(m => m.total) ?? [1]));

  // Portfolio by type
  const portfolioByType: Record<string, number> = {};
  portfolio?.forEach(item => {
    const val = item.currentValue ?? item.totalCost;
    portfolioByType[item.type] = (portfolioByType[item.type] ?? 0) + val;
  });
  const totalPortfolio = Object.values(portfolioByType).reduce((s, v) => s + v, 0);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 90;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Statistiche</Text>
      </View>

      {/* Monthly expenses chart */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SPESE MENSILI</Text>
      <Card style={{ marginHorizontal: 16 }}>
        {monthlyExp && monthlyExp.length > 0 ? (
          <>
            <Text style={[styles.chartTotal, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              {formatCurrency(monthlyExp[monthlyExp.length - 1]?.total ?? 0)}
            </Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Mese corrente
            </Text>
            <View style={styles.monthBarsRow}>
              {monthlyExp.slice(-12).map((item, i) => (
                <MonthBar key={item.month} item={item} maxVal={maxMonthly} />
              ))}
            </View>
          </>
        ) : (
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ color: colors.textSecondary, textAlign: "center", fontFamily: "Inter_400Regular" }}>
              Nessun dato disponibile
            </Text>
          </View>
        )}
      </Card>

      {/* Categories breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SPESE PER CATEGORIA</Text>
      <Card style={{ marginHorizontal: 16 }}>
        {catStats && catStats.length > 0 ? (
          <>
            <Text style={[styles.chartTotal, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              {formatCurrency(totalExpenses)}
            </Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Totale spese
            </Text>
            <View style={{ marginTop: 16, gap: 16 }}>
              {catStats.map((stat) => (
                <CategoryBar key={stat.categoryId ?? "none"} stat={stat} total={totalExpenses} />
              ))}
            </View>
          </>
        ) : (
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ color: colors.textSecondary, textAlign: "center", fontFamily: "Inter_400Regular" }}>
              Nessuna spesa categorizzata
            </Text>
          </View>
        )}
      </Card>

      {/* Portfolio allocation */}
      {portfolio && portfolio.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ALLOCAZIONE PORTAFOGLIO</Text>
          <Card style={{ marginHorizontal: 16 }}>
            <Text style={[styles.chartTotal, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              {formatCurrency(totalPortfolio)}
            </Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Valore totale investito
            </Text>
            <View style={{ marginTop: 16, gap: 12 }}>
              {Object.entries(portfolioByType).map(([type, val]) => {
                const pct = totalPortfolio > 0 ? (val / totalPortfolio * 100) : 0;
                const color = TYPE_COLORS[type] ?? "#8E8E93";
                return (
                  <View key={type}>
                    <View style={styles.catBarHeader}>
                      <View style={styles.catBarLeft}>
                        <View style={[styles.catDot, { backgroundColor: color }]} />
                        <Text style={[styles.catName, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{type}</Text>
                      </View>
                      <View style={styles.catBarRight}>
                        <Text style={[styles.catAmount, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                          {formatCurrency(val)}
                        </Text>
                        <Text style={[styles.catPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                      </View>
                    </View>
                    <View style={[styles.catBarBg, { backgroundColor: colors.separator }]}>
                      <View style={[styles.catBarFill, { backgroundColor: color, width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}

      {/* Patrimony split */}
      {portfolio && portfolio.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SINGOLI STRUMENTI</Text>
          <Card style={{ marginHorizontal: 16 }}>
            {portfolio.map(item => {
              const val = item.currentValue ?? item.totalCost;
              const pct = totalPortfolio > 0 ? (val / totalPortfolio * 100) : 0;
              const color = TYPE_COLORS[item.type] ?? "#8E8E93";
              return (
                <View key={item.instrumentId} style={{ marginBottom: 16 }}>
                  <View style={styles.catBarHeader}>
                    <View style={styles.catBarLeft}>
                      <View style={[styles.catDot, { backgroundColor: color }]} />
                      <Text style={[styles.catName, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{item.ticker}</Text>
                    </View>
                    <View style={styles.catBarRight}>
                      <Text style={[styles.catAmount, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                        {formatCurrency(val)}
                      </Text>
                      <Text style={[styles.catPct, { color: colors.textSecondary }]}>{pct.toFixed(1)}%</Text>
                    </View>
                  </View>
                  <View style={[styles.catBarBg, { backgroundColor: colors.separator }]}>
                    <View style={[styles.catBarFill, { backgroundColor: color, width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28 },
  sectionTitle: {
    fontSize: 13, letterSpacing: 0.4, fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
  },
  chartTotal: { fontSize: 28 },
  chartSubtitle: { fontSize: 13, marginTop: 2 },
  monthBarsRow: { flexDirection: "row", height: 100, alignItems: "flex-end", marginTop: 16, gap: 4 },
  monthBarItem: { flex: 1, alignItems: "center", gap: 4 },
  monthBarContainer: { flex: 1, width: "100%", justifyContent: "flex-end" },
  monthBarFill: { width: "100%", borderRadius: 4, minHeight: 4 },
  monthBarLabel: { fontSize: 9 },
  catBarRow: { gap: 6 },
  catBarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catBarLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  catBarRight: { alignItems: "flex-end" },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 15, flex: 1 },
  catAmount: { fontSize: 15 },
  catPct: { fontSize: 12, fontFamily: "Inter_400Regular" },
  catBarBg: { height: 6, borderRadius: 3, width: "100%" },
  catBarFill: { height: 6, borderRadius: 3 },
});
