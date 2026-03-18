import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { EmptyState } from "@/components/ui/EmptyState";

const today = () => new Date().toISOString().split("T")[0];

export default function IndiciScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [tab, setTab] = useState<"prices" | "rates">("prices");

  // Asset prices
  const { data: instruments } = useQuery({ queryKey: ["instruments"], queryFn: api.getInstruments });
  const { data: prices, isLoading: prLoad } = useQuery({ queryKey: ["asset-prices"], queryFn: () => api.getAssetPrices() });
  const [selInstrument, setSelInstrument] = useState<number | null>(null);
  const [priceDate, setPriceDate] = useState(today());
  const [priceValue, setPriceValue] = useState("");

  const createPrice = useMutation({
    mutationFn: api.createAssetPrice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["asset-prices"] }); qc.invalidateQueries({ queryKey: ["portfolio"] }); qc.invalidateQueries({ queryKey: ["summary"] }); setPriceValue(""); },
  });
  const deletePrice = useMutation({
    mutationFn: api.deleteAssetPrice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["asset-prices"] }); qc.invalidateQueries({ queryKey: ["portfolio"] }); },
  });

  // Interest rates
  const { data: institutions } = useQuery({ queryKey: ["institutions"], queryFn: api.getInstitutions });
  const { data: rates } = useQuery({ queryKey: ["interest-rates"], queryFn: () => api.getInterestRates() });
  const [selInstitution, setSelInstitution] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState(today());
  const [rateValue, setRateValue] = useState("");

  const createRate = useMutation({
    mutationFn: api.createInterestRate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interest-rates"] }); setRateValue(""); },
  });
  const deleteRate = useMutation({
    mutationFn: api.deleteInterestRate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interest-rates"] }),
  });

  const confirmDelete = (onDelete: () => void) =>
    Alert.alert("Elimina", "Eliminare questo dato?", [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: onDelete },
    ]);

  const inputStyle = [styles.input, {
    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
    color: colors.text, fontFamily: "Inter_400Regular", borderColor: colors.separator,
  }];

  const instName = (id: number) => instruments?.find(i => i.id === id)?.ticker ?? `#${id}`;
  const instBankName = (id: number) => institutions?.find(i => i.id === id)?.name ?? `#${id}`;

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.separator }]}>
        {(["prices", "rates"] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? colors.tint : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {t === "prices" ? "Prezzi Asset" : "Tassi Interesse"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }}>
        {tab === "prices" && (
          <>
            {/* Add price form */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                Aggiungi prezzo
              </Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>STRUMENTO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {instruments?.map(instr => (
                    <Pressable
                      key={instr.id}
                      onPress={() => setSelInstrument(instr.id)}
                      style={[styles.chip, { backgroundColor: selInstrument === instr.id ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
                    >
                      <Text style={[styles.chipText, { color: selInstrument === instr.id ? "#FFF" : colors.text }]}>{instr.ticker}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.label, { color: colors.textSecondary }]}>DATA</Text>
              <TextInput style={inputStyle} value={priceDate} onChangeText={setPriceDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>PREZZO (€)</Text>
              <TextInput style={inputStyle} value={priceValue} onChangeText={setPriceValue} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} />
              <Pressable
                onPress={() => selInstrument && priceValue && createPrice.mutate({ instrumentId: selInstrument, date: priceDate, price: priceValue })}
                disabled={!selInstrument || !priceValue}
                style={[styles.addBtn, { backgroundColor: colors.tint, opacity: !selInstrument || !priceValue ? 0.5 : 1 }]}
              >
                <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>Aggiungi</Text>
              </Pressable>
            </View>

            {/* List */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREZZI INSERITI</Text>
            {prices && prices.length > 0 ? (
              [...prices].reverse().map(p => (
                <View key={p.id} style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{instName(p.instrumentId)}</Text>
                    <Text style={[styles.rowSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{p.date}</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>€{parseFloat(p.price).toFixed(4)}</Text>
                  <Pressable onPress={() => confirmDelete(() => deletePrice.mutate(p.id))} style={{ padding: 8 }}>
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyState icon="bar-chart-2" title="Nessun prezzo" subtitle="Inserisci i prezzi di mercato degli strumenti" />
            )}
          </>
        )}

        {tab === "rates" && (
          <>
            {/* Add rate form */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                Aggiungi tasso
              </Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>ISTITUTO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {institutions?.map(inst => (
                    <Pressable
                      key={inst.id}
                      onPress={() => setSelInstitution(inst.id)}
                      style={[styles.chip, { backgroundColor: selInstitution === inst.id ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
                    >
                      <Text style={[styles.chipText, { color: selInstitution === inst.id ? "#FFF" : colors.text }]}>{inst.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={[styles.label, { color: colors.textSecondary }]}>DATA</Text>
              <TextInput style={inputStyle} value={rateDate} onChangeText={setRateDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>TASSO (%)</Text>
              <TextInput style={inputStyle} value={rateValue} onChangeText={setRateValue} keyboardType="decimal-pad" placeholder="3.50" placeholderTextColor={colors.textSecondary} />
              <Pressable
                onPress={() => selInstitution && rateValue && createRate.mutate({ institutionId: selInstitution, date: rateDate, rate: rateValue })}
                disabled={!selInstitution || !rateValue}
                style={[styles.addBtn, { backgroundColor: colors.tint, opacity: !selInstitution || !rateValue ? 0.5 : 1 }]}
              >
                <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>Aggiungi</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TASSI INSERITI</Text>
            {rates && rates.length > 0 ? (
              [...rates].reverse().map(r => (
                <View key={r.id} style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{instBankName(r.institutionId)}</Text>
                    <Text style={[styles.rowSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{r.date}</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: "#30D158", fontFamily: "Inter_600SemiBold" }]}>{parseFloat(r.rate).toFixed(2)}%</Text>
                  <Pressable onPress={() => confirmDelete(() => deleteRate.mutate(r.id))} style={{ padding: 8 }}>
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyState icon="percent" title="Nessun tasso" subtitle="Inserisci i tassi d'interesse dei conti correnti" />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 15 },
  formCard: {
    margin: 16, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  formTitle: { fontSize: 17, marginBottom: 12 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, marginBottom: 6, marginTop: 12 },
  input: {
    borderRadius: 10, padding: 12, fontSize: 15, borderWidth: StyleSheet.hairlineWidth,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addBtn: { marginTop: 16, padding: 14, borderRadius: 12, alignItems: "center" },
  addBtnText: { color: "#FFF", fontSize: 15 },
  sectionTitle: {
    fontSize: 13, letterSpacing: 0.4, fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  row: {
    flexDirection: "row", alignItems: "center", padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowValue: { fontSize: 17, marginRight: 4 },
});
