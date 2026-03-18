import React from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Platform
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, InstitutionBalance, FinancialSummary } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";

function formatCurrency(n: number) {
  return `€${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PatrimonyCard({ summary }: { summary: FinancialSummary }) {
  const { colors, isDark } = useTheme();
  const diff = summary.totalExpensesLast30Days - summary.totalExpensesPrev30Days;
  const diffPct = summary.totalExpensesPrev30Days > 0
    ? ((diff / summary.totalExpensesPrev30Days) * 100).toFixed(1)
    : null;

  return (
    <View style={[styles.bigCard, { backgroundColor: colors.tint }]}>
      <Text style={[styles.bigCardLabel, { color: "rgba(255,255,255,0.7)" }]}>Patrimonio Totale</Text>
      <Text style={styles.bigCardAmount}>{formatCurrency(summary.totalPatrimony)}</Text>
      <View style={styles.bigCardRow}>
        <View style={styles.bigCardStat}>
          <Text style={styles.bigCardStatLabel}>Liquidità</Text>
          <Text style={styles.bigCardStatValue}>{formatCurrency(summary.totalCash)}</Text>
        </View>
        <View style={[styles.bigCardDivider]} />
        <View style={styles.bigCardStat}>
          <Text style={styles.bigCardStatLabel}>Investito</Text>
          <Text style={styles.bigCardStatValue}>{formatCurrency(summary.totalInvestedValue)}</Text>
        </View>
      </View>
    </View>
  );
}

function ExpenseRow({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.expRow}>
      <View>
        <Text style={[styles.expLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{label}</Text>
        {sub && <Text style={[styles.expSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{sub}</Text>}
      </View>
      <MoneyText
        amount={value}
        style={{ fontFamily: "Inter_600SemiBold", fontSize: 17, color: colors.text }}
        colored={false}
      />
    </View>
  );
}

function InstitutionRow({ inst }: { inst: InstitutionBalance }) {
  const { colors } = useTheme();
  const isPositive = inst.totalValue >= 0;

  return (
    <View style={[styles.instRow, { borderBottomColor: colors.separator }]}>
      <View style={[styles.instDot, { backgroundColor: inst.color ?? "#8E8E93" }]} />
      <View style={styles.instInfo}>
        <Text style={[styles.instName, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{inst.name}</Text>
        <Text style={[styles.instType, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {inst.type} · Liquidità: {formatCurrency(inst.cashBalance)}
        </Text>
      </View>
      <Text style={[
        styles.instTotal,
        { color: isPositive ? colors.text : "#FF453A", fontFamily: "Inter_700Bold" }
      ]}>
        {formatCurrency(inst.totalValue)}
      </Text>
    </View>
  );
}

export default function PrincipaleScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: summary, isLoading: sumLoading, refetch: refetchSum } = useQuery({
    queryKey: ["summary"],
    queryFn: api.getSummary,
  });
  const { data: balances, isLoading: balLoading, refetch: refetchBal } = useQuery({
    queryKey: ["institution-balances"],
    queryFn: api.getInstitutionBalances,
  });
  const { data: expenses, isLoading: expLoading, refetch: refetchExp } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.getExpenses(),
  });

  const isLoading = sumLoading || balLoading || expLoading;

  const onRefresh = () => {
    refetchSum();
    refetchBal();
    refetchExp();
  };

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 90;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          Financial Hub
        </Text>
        <Pressable
          onPress={() => router.push("/indici")}
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="activity" size={22} color={colors.tint} />
        </Pressable>
      </View>

      {/* Patrimony Card */}
      {summary && <PatrimonyCard summary={summary} />}

      {/* Spese */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        SPESE
      </Text>
      <Card style={{ marginHorizontal: 16 }}>
        {summary ? (
          <>
            <ExpenseRow
              label="Questo mese"
              value={summary.totalExpensesMonth}
              sub={new Date().toLocaleString("it-IT", { month: "long", year: "numeric" })}
            />
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <ExpenseRow label="Ultimi 30 giorni" value={summary.totalExpensesLast30Days} />
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <ExpenseRow
              label="30 giorni precedenti"
              value={summary.totalExpensesPrev30Days}
            />
          </>
        ) : (
          <View style={{ height: 80 }} />
        )}
      </Card>

      {/* Istituti */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
        ISTITUTI
      </Text>
      <Card style={{ marginHorizontal: 16, padding: 0, overflow: "hidden" }}>
        {balances && balances.length > 0 ? (
          balances.map((inst, i) => (
            <InstitutionRow key={inst.institutionId} inst={inst} />
          ))
        ) : (
          <View style={{ padding: 16 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" }}>
              Nessun istituto configurato
            </Text>
          </View>
        )}
      </Card>

      {/* Patrimonio investito breakdown */}
      {summary && summary.totalInvestedValue > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
            PORTAFOGLIO
          </Text>
          <Card style={{ marginHorizontal: 16 }}>
            <View style={styles.portfolioRow}>
              <View>
                <Text style={[styles.expLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>Valore di mercato</Text>
                <Text style={[styles.expSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  ai prezzi attuali inseriti
                </Text>
              </View>
              <Text style={[styles.instTotal, { color: colors.tint, fontFamily: "Inter_700Bold" }]}>
                {formatCurrency(summary.totalInvestedValue)}
              </Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <View style={styles.portfolioRow}>
              <Text style={[styles.expLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>Costo medio</Text>
              <Text style={[styles.instTotal, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {formatCurrency(summary.totalInvested)}
              </Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <View style={styles.portfolioRow}>
              <Text style={[styles.expLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>Rendimento</Text>
              <Text style={{
                fontFamily: "Inter_700Bold", fontSize: 17,
                color: summary.totalInvestedValue >= summary.totalInvested ? "#30D158" : "#FF453A"
              }}>
                {formatCurrency(summary.totalInvestedValue - summary.totalInvested)}
              </Text>
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 28 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bigCard: {
    marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  bigCardLabel: { fontSize: 14, marginBottom: 4 },
  bigCardAmount: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFF", marginBottom: 20 },
  bigCardRow: { flexDirection: "row", alignItems: "center" },
  bigCardStat: { flex: 1, alignItems: "center" },
  bigCardStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  bigCardStatValue: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  bigCardDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },
  sectionTitle: { fontSize: 13, letterSpacing: 0.4, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  expRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  expLabel: { fontSize: 16 },
  expSub: { fontSize: 13, marginTop: 2 },
  separator: { height: 1, marginHorizontal: -16 },
  instRow: {
    flexDirection: "row", alignItems: "center", padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  instDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  instInfo: { flex: 1 },
  instName: { fontSize: 16 },
  instType: { fontSize: 13, marginTop: 2 },
  instTotal: { fontSize: 17 },
  portfolioRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
});
