import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const today = () => new Date().toISOString().split("T")[0];

export default function AddFinancialModal() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [type, setType] = useState<"acquisto" | "vendita">("acquisto");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [instrumentId, setInstrumentId] = useState<number | null>(null);
  const [commissions, setCommissions] = useState("0");
  const [institutionId, setInstitutionId] = useState<number | null>(null);

  const { data: instruments } = useQuery({ queryKey: ["instruments"], queryFn: api.getInstruments });
  const { data: institutions } = useQuery({ queryKey: ["institutions"], queryFn: api.getInstitutions });

  const total = pricePerUnit && quantity
    ? (parseFloat(pricePerUnit) * parseFloat(quantity) + parseFloat(commissions || "0")).toFixed(2)
    : null;

  const mutation = useMutation({
    mutationFn: api.createFinancialTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-transactions"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["institution-balances"] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!pricePerUnit || !quantity || !date) return;
    mutation.mutate({
      type, date, description: description || undefined,
      pricePerUnit, quantity,
      instrumentId: instrumentId ?? undefined,
      commissions: commissions || "0",
      institutionId: institutionId ?? undefined,
    });
  };

  const inputStyle = [styles.input, {
    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
    color: colors.text, fontFamily: "Inter_400Regular", borderColor: colors.separator,
  }];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Tipo */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO</Text>
      <View style={styles.typeRow}>
        {(["acquisto", "vendita"] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[
              styles.typeBtn,
              { backgroundColor: type === t ? (t === "acquisto" ? "#FF453A" : "#30D158") : (isDark ? "#2C2C2E" : "#E5E5EA") },
            ]}
          >
            <Text style={[styles.typeBtnText, { color: type === t ? "#FFF" : colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {t === "acquisto" ? "Acquisto" : "Vendita"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>DATA</Text>
      <TextInput style={inputStyle} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />

      {/* Strumento */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>STRUMENTO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => setInstrumentId(null)}
            style={[styles.chip, { backgroundColor: instrumentId === null ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
          >
            <Text style={[styles.chipText, { color: instrumentId === null ? "#FFF" : colors.text }]}>Nessuno</Text>
          </Pressable>
          {instruments?.map(instr => (
            <Pressable
              key={instr.id}
              onPress={() => setInstrumentId(instr.id)}
              style={[styles.chip, { backgroundColor: instrumentId === instr.id ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
            >
              <Text style={[styles.chipText, { color: instrumentId === instr.id ? "#FFF" : colors.text }]}>{instr.ticker}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.label, { color: colors.textSecondary }]}>PREZZO UNITARIO (€)</Text>
      <TextInput style={inputStyle} value={pricePerUnit} onChangeText={setPricePerUnit} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>QUANTITÀ</Text>
      <TextInput style={inputStyle} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textSecondary} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>COMMISSIONI (€)</Text>
      <TextInput style={inputStyle} value={commissions} onChangeText={setCommissions} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} />

      {/* Total preview */}
      {total && (
        <View style={[styles.totalPreview, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Totale operazione</Text>
          <Text style={[styles.totalAmount, { color: type === "acquisto" ? "#FF453A" : "#30D158", fontFamily: "Inter_700Bold" }]}>
            {type === "acquisto" ? "-" : "+"}€{total}
          </Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>ISTITUTO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => setInstitutionId(null)}
            style={[styles.chip, { backgroundColor: institutionId === null ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
          >
            <Text style={[styles.chipText, { color: institutionId === null ? "#FFF" : colors.text }]}>Nessuno</Text>
          </Pressable>
          {institutions?.map(inst => (
            <Pressable
              key={inst.id}
              onPress={() => setInstitutionId(inst.id)}
              style={[styles.chip, { backgroundColor: institutionId === inst.id ? (inst.color ?? colors.tint) : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
            >
              <Text style={[styles.chipText, { color: institutionId === inst.id ? "#FFF" : colors.text }]}>{inst.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIZIONE (opzionale)</Text>
      <TextInput style={inputStyle} value={description} onChangeText={setDescription} placeholder="es. PAC mensile" placeholderTextColor={colors.textSecondary} />

      <Pressable
        onPress={handleSave}
        disabled={mutation.isPending || !pricePerUnit || !quantity}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.tint, opacity: pressed || mutation.isPending || !pricePerUnit || !quantity ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>
          {mutation.isPending ? "Salvataggio..." : "Salva Transazione"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  typeRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  typeBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center" },
  typeBtnText: { fontSize: 15 },
  input: {
    marginHorizontal: 16, borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalPreview: {
    marginHorizontal: 16, borderRadius: 12, padding: 16, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center", marginVertical: 8,
  },
  totalLabel: { fontSize: 14 },
  totalAmount: { fontSize: 22 },
  saveBtn: { margin: 16, marginTop: 24, padding: 18, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontSize: 18 },
});
