import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, FlatList,
  RefreshControl, TouchableOpacity, Platform, Alert
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, OrdinaryExpense, Transfer, FinancialTransaction } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "ordinarie" | "movimenti" | "finanziarie";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
function formatCurrency(n: number | string) {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `€${num.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SpeseScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const [activeTab, setActiveTab] = useState<Tab>("ordinarie");

  const { data: expenses, isLoading: expLoad, refetch: refetchExp } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => api.getExpenses(),
  });
  const { data: transfers, isLoading: trLoad, refetch: refetchTr } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => api.getTransfers(),
  });
  const { data: financialTxns, isLoading: finLoad, refetch: refetchFin } = useQuery({
    queryKey: ["financial-transactions"],
    queryFn: () => api.getFinancialTransactions(),
  });
  const { data: institutions } = useQuery({ queryKey: ["institutions"], queryFn: api.getInstitutions });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const { data: instruments } = useQuery({ queryKey: ["instruments"], queryFn: api.getInstruments });

  const deleteExp = useMutation({ mutationFn: api.deleteExpense, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }) });
  const deleteTr = useMutation({ mutationFn: api.deleteTransfer, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfers"] }) });
  const deleteFin = useMutation({ mutationFn: api.deleteFinancialTransaction, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-transactions"] }) });

  const isLoading = expLoad || trLoad || finLoad;

  const onRefresh = () => { refetchExp(); refetchTr(); refetchFin(); };

  const confirmDelete = (label: string, onDelete: () => void) => {
    Alert.alert("Elimina", `Eliminare "${label}"?`, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: onDelete },
    ]);
  };

  const institutionName = (id?: number | null) => institutions?.find(i => i.id === id)?.name ?? "—";
  const categoryName = (id?: number | null) => categories?.find(c => c.id === id)?.name ?? "—";
  const instrumentName = (id?: number | null) => instruments?.find(i => i.id === id)?.name ?? "—";

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 90;

  const TABS: { key: Tab; label: string }[] = [
    { key: "ordinarie", label: "Ordinarie" },
    { key: "movimenti", label: "Movimenti" },
    { key: "finanziarie", label: "Finanziarie" },
  ];

  const addRoute = activeTab === "ordinarie"
    ? "/modal/add-expense"
    : activeTab === "movimenti"
    ? "/modal/add-transfer"
    : "/modal/add-financial";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Spese</Text>
        <Pressable
          onPress={() => router.push(addRoute as any)}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="plus" size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.separator }]}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          >
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? colors.tint : colors.textSecondary, fontFamily: "Inter_500Medium" }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {activeTab === "ordinarie" && (
          expenses && expenses.length > 0 ? (
            expenses.map((exp, i) => (
              <View key={exp.id} style={[styles.row, { borderBottomColor: colors.separator }]}>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: exp.type === "acquisto" ? "rgba(255,69,58,0.12)" : "rgba(48,209,88,0.12)" }
                ]}>
                  <Text style={[styles.typeBadgeText, { color: exp.type === "acquisto" ? "#FF453A" : "#30D158" }]}>
                    {exp.type === "acquisto" ? "UST" : "VEN"}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{exp.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {formatDate(exp.date)} · {categoryName(exp.categoryId)} · {institutionName(exp.institutionId)}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[
                    styles.rowAmount,
                    { fontFamily: "Inter_600SemiBold", color: exp.type === "acquisto" ? "#FF453A" : "#30D158" }
                  ]}>
                    {exp.type === "acquisto" ? "-" : "+"}{formatCurrency(exp.amount)}
                  </Text>
                  <Pressable onPress={() => confirmDelete(exp.name, () => deleteExp.mutate(exp.id))} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="shopping-bag" title="Nessuna spesa" subtitle="Aggiungi la tua prima spesa ordinaria" />
          )
        )}

        {activeTab === "movimenti" && (
          transfers && transfers.length > 0 ? (
            transfers.map((tr) => (
              <View key={tr.id} style={[styles.row, { borderBottomColor: colors.separator }]}>
                <View style={[styles.typeBadge, { backgroundColor: "rgba(10,132,255,0.12)" }]}>
                  <Feather name="arrow-right" size={16} color="#0A84FF" />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                    {institutionName(tr.fromInstitutionId)} → {institutionName(tr.toInstitutionId)}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {formatDate(tr.date)}{tr.description ? ` · ${tr.description}` : ""}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowAmount, { fontFamily: "Inter_600SemiBold", color: colors.text }]}>
                    {formatCurrency(tr.amount)}
                  </Text>
                  <Pressable onPress={() => confirmDelete("movimento", () => deleteTr.mutate(tr.id))} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="shuffle" title="Nessun movimento" subtitle="Registra un trasferimento tra istituti" />
          )
        )}

        {activeTab === "finanziarie" && (
          financialTxns && financialTxns.length > 0 ? (
            financialTxns.map((txn) => (
              <View key={txn.id} style={[styles.row, { borderBottomColor: colors.separator }]}>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: txn.type === "acquisto" ? "rgba(255,69,58,0.12)" : "rgba(48,209,88,0.12)" }
                ]}>
                  <Text style={[styles.typeBadgeText, { color: txn.type === "acquisto" ? "#FF453A" : "#30D158" }]}>
                    {txn.type === "acquisto" ? "ACQ" : "VEN"}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                    {instrumentName(txn.instrumentId)}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {formatDate(txn.date)} · {txn.quantity}x @ {formatCurrency(txn.pricePerUnit)}
                    {txn.commissions && Number(txn.commissions) > 0 ? ` · comm. ${formatCurrency(txn.commissions)}` : ""}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[
                    styles.rowAmount,
                    { fontFamily: "Inter_600SemiBold", color: txn.type === "acquisto" ? "#FF453A" : "#30D158" }
                  ]}>
                    {txn.type === "acquisto" ? "-" : "+"}{formatCurrency(
                      (parseFloat(txn.quantity) * parseFloat(txn.pricePerUnit) + parseFloat(txn.commissions ?? "0")).toString()
                    )}
                  </Text>
                  <Pressable onPress={() => confirmDelete("transazione", () => deleteFin.mutate(txn.id))} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <EmptyState icon="trending-up" title="Nessuna transazione" subtitle="Registra un acquisto o vendita di strumenti finanziari" />
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 28 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 14 },
  row: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeBadge: {
    width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  rowAmount: { fontSize: 16 },
});
