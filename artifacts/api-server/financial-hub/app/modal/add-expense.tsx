import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const today = () => new Date().toISOString().split("T")[0];

export default function AddExpenseModal() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [type, setType] = useState<"acquisto" | "vendita">("acquisto");
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const { data: subcategories } = useQuery({ queryKey: ["subcategories"], queryFn: api.getSubcategories });
  const { data: institutions } = useQuery({ queryKey: ["institutions"], queryFn: api.getInstitutions });

  const filteredSubs = subcategories?.filter(s => s.categoryId === categoryId) ?? [];

  const mutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["institution-balances"] });
      qc.invalidateQueries({ queryKey: ["expenses-by-category"] });
      qc.invalidateQueries({ queryKey: ["monthly-expenses"] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!name || !amount || !date) return;
    mutation.mutate({
      type, date, name, amount,
      categoryId: categoryId ?? undefined,
      subcategoryId: subcategoryId ?? undefined,
      institutionId: institutionId ?? undefined,
      notes: notes || undefined,
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
      {/* Tipo */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>TIPO</Text>
      <View style={styles.typeRow}>
        {(["acquisto", "vendita"] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[
              styles.typeBtn,
              {
                backgroundColor: type === t
                  ? (t === "acquisto" ? "#FF453A" : "#30D158")
                  : (isDark ? "#2C2C2E" : "#E5E5EA"),
              },
            ]}
          >
            <Text style={[styles.typeBtnText, { color: type === t ? "#FFF" : colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {t === "acquisto" ? "Acquisto / Uscita" : "Vendita / Entrata"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Data */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>DATA</Text>
      <TextInput style={inputStyle} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />

      {/* Nome */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>NOME</Text>
      <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="es. Cena al ristorante" placeholderTextColor={colors.textSecondary} />

      {/* Importo */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>IMPORTO (€)</Text>
      <TextInput style={inputStyle} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textSecondary} />

      {/* Categoria */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORIA</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => { setCategoryId(null); setSubcategoryId(null); }}
            style={[styles.chip, { backgroundColor: categoryId === null ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
          >
            <Text style={[styles.chipText, { color: categoryId === null ? "#FFF" : colors.text }]}>Nessuna</Text>
          </Pressable>
          {categories?.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => { setCategoryId(cat.id); setSubcategoryId(null); }}
              style={[styles.chip, { backgroundColor: categoryId === cat.id ? (cat.color ?? colors.tint) : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
            >
              <Text style={[styles.chipText, { color: categoryId === cat.id ? "#FFF" : colors.text }]}>{cat.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Sottocategoria */}
      {filteredSubs.length > 0 && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>SOTTOCATEGORIA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
              <Pressable
                onPress={() => setSubcategoryId(null)}
                style={[styles.chip, { backgroundColor: subcategoryId === null ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
              >
                <Text style={[styles.chipText, { color: subcategoryId === null ? "#FFF" : colors.text }]}>Nessuna</Text>
              </Pressable>
              {filteredSubs.map(sub => (
                <Pressable
                  key={sub.id}
                  onPress={() => setSubcategoryId(sub.id)}
                  style={[styles.chip, { backgroundColor: subcategoryId === sub.id ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
                >
                  <Text style={[styles.chipText, { color: subcategoryId === sub.id ? "#FFF" : colors.text }]}>{sub.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Istituto */}
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

      {/* Note */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>NOTE (opzionale)</Text>
      <TextInput
        style={[inputStyle, { minHeight: 80, textAlignVertical: "top" }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Aggiungi una nota..."
        placeholderTextColor={colors.textSecondary}
        multiline
      />

      {/* Save */}
      <Pressable
        onPress={handleSave}
        disabled={mutation.isPending || !name || !amount}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.tint, opacity: pressed || mutation.isPending || !name || !amount ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>
          {mutation.isPending ? "Salvataggio..." : "Salva Spesa"}
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
  saveBtn: { margin: 16, marginTop: 24, padding: 18, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#FFF", fontSize: 18 },
});
