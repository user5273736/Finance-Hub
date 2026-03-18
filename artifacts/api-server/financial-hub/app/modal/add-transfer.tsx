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

export default function AddTransferModal() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");

  const { data: institutions } = useQuery({ queryKey: ["institutions"], queryFn: api.getInstitutions });

  const mutation = useMutation({
    mutationFn: api.createTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["institution-balances"] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!amount || !date) return;
    mutation.mutate({
      date,
      description: description || undefined,
      fromInstitutionId: fromId ?? undefined,
      toInstitutionId: toId ?? undefined,
      amount,
    });
  };

  const inputStyle = [styles.input, {
    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
    color: colors.text,
    fontFamily: "Inter_400Regular",
    borderColor: colors.separator,
  }];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>DATA</Text>
      <TextInput style={inputStyle} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>IMPORTO (€)</Text>
      <TextInput style={inputStyle} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} />

      <Text style={[styles.label, { color: colors.textSecondary }]}>DA ISTITUTO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => setFromId(null)}
            style={[styles.chip, { backgroundColor: fromId === null ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
          >
            <Text style={[styles.chipText, { color: fromId === null ? "#FFF" : colors.text }]}>Nessuno</Text>
          </Pressable>
          {institutions?.map(inst => (
            <Pressable
              key={inst.id}
              onPress={() => setFromId(inst.id)}
              style={[styles.chip, { backgroundColor: fromId === inst.id ? (inst.color ?? colors.tint) : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
            >
              <Text style={[styles.chipText, { color: fromId === inst.id ? "#FFF" : colors.text }]}>{inst.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.label, { color: colors.textSecondary }]}>A ISTITUTO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => setToId(null)}
            style={[styles.chip, { backgroundColor: toId === null ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
          >
            <Text style={[styles.chipText, { color: toId === null ? "#FFF" : colors.text }]}>Nessuno</Text>
          </Pressable>
          {institutions?.map(inst => (
            <Pressable
              key={inst.id}
              onPress={() => setToId(inst.id)}
              style={[styles.chip, { backgroundColor: toId === inst.id ? (inst.color ?? colors.tint) : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
            >
              <Text style={[styles.chipText, { color: toId === inst.id ? "#FFF" : colors.text }]}>{inst.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIZIONE (opzionale)</Text>
      <TextInput
        style={inputStyle}
        value={description}
        onChangeText={setDescription}
        placeholder="es. Ricarica conto trading"
        placeholderTextColor={colors.textSecondary}
      />

      <Pressable
        onPress={handleSave}
        disabled={mutation.isPending || !amount}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.tint, opacity: pressed || mutation.isPending || !amount ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>
          {mutation.isPending ? "Salvataggio..." : "Salva Movimento"}
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
  input: {
    marginHorizontal: 16, borderRadius: 10, padding: 14, fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { margin: 16, marginTop: 24, padding: 18, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontSize: 18 },
});
