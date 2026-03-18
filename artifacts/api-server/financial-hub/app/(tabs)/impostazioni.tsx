import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, Alert,
  TextInput, Modal, RefreshControl, Platform
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api, Institution, Category, Subcategory, Instrument } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

const INSTITUTION_TYPES = ["bank", "broker", "crypto", "other"];
const INST_TYPE_LABELS: Record<string, string> = {
  bank: "Banca", broker: "Broker", crypto: "Crypto Exchange", other: "Altro"
};
const INSTRUMENT_TYPES = ["ETF", "Azione", "Crypto", "Obbligazione", "Altro"];
const PALETTE = ["#FF453A","#FF9F0A","#30D158","#0A84FF","#5E5CE6","#AC8E68","#636366","#FF375F","#64D2FF","#FFD60A"];
const ICONS = ["tag","shopping-bag","home","car","heart","coffee","book","music","camera","globe"];

type FormModal = {
  type: "institution" | "category" | "subcategory" | "instrument" | null;
};

export default function ImpostazioniScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [modal, setModal] = useState<FormModal>({ type: null });
  const [section, setSection] = useState<"institutions" | "categories" | "instruments">("institutions");

  // Queries
  const { data: institutions, refetch: refInst } = useQuery({ queryKey: ["institutions"], queryFn: api.getInstitutions });
  const { data: categories, refetch: refCat } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const { data: subcategories, refetch: refSub } = useQuery({ queryKey: ["subcategories"], queryFn: api.getSubcategories });
  const { data: instruments, refetch: refInstr } = useQuery({ queryKey: ["instruments"], queryFn: api.getInstruments });

  // Institution form
  const [instName, setInstName] = useState("");
  const [instType, setInstType] = useState("bank");
  const [instBal, setInstBal] = useState("0");
  const [instColor, setInstColor] = useState(PALETTE[3]);

  // Category form
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(PALETTE[2]);
  const [catIcon, setCatIcon] = useState(ICONS[0]);

  // Subcategory form
  const [subName, setSubName] = useState("");
  const [subCatId, setSubCatId] = useState<number | null>(null);

  // Instrument form
  const [instrTicker, setInstrTicker] = useState("");
  const [instrName, setInstrName] = useState("");
  const [instrType, setInstrType] = useState("ETF");
  const [instrCurrency, setInstrCurrency] = useState("EUR");

  // Mutations
  const createInst = useMutation({
    mutationFn: api.createInstitution,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["institutions"] }); setModal({ type: null }); resetInstForm(); },
  });
  const deleteInst = useMutation({
    mutationFn: api.deleteInstitution,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["institutions"] }),
  });
  const createCat = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setModal({ type: null }); resetCatForm(); },
  });
  const deleteCat = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
  const createSub = useMutation({
    mutationFn: api.createSubcategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcategories"] }); setModal({ type: null }); resetSubForm(); },
  });
  const deleteSub = useMutation({
    mutationFn: api.deleteSubcategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subcategories"] }),
  });
  const createInstr = useMutation({
    mutationFn: api.createInstrument,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["instruments"] }); setModal({ type: null }); resetInstrForm(); },
  });
  const deleteInstr = useMutation({
    mutationFn: api.deleteInstrument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instruments"] }),
  });

  const resetInstForm = () => { setInstName(""); setInstType("bank"); setInstBal("0"); setInstColor(PALETTE[3]); };
  const resetCatForm = () => { setCatName(""); setCatColor(PALETTE[2]); setCatIcon(ICONS[0]); };
  const resetSubForm = () => { setSubName(""); setSubCatId(null); };
  const resetInstrForm = () => { setInstrTicker(""); setInstrName(""); setInstrType("ETF"); setInstrCurrency("EUR"); };

  const confirmDelete = (label: string, onDelete: () => void) => {
    Alert.alert("Elimina", `Eliminare "${label}"?`, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: onDelete },
    ]);
  };

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : 90;

  const inputStyle = [styles.input, {
    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
    color: colors.text, borderColor: colors.separator,
    fontFamily: "Inter_400Regular",
  }];

  const modalBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const secInst = section === "institutions";
  const secCat = section === "categories";
  const secInstr = section === "instruments";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Configurazione</Text>
        <Pressable onPress={() => router.push("/indici")} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="activity" size={22} color={colors.tint} />
        </Pressable>
      </View>

      {/* Section tabs */}
      <View style={[styles.segmented, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        {(["institutions", "categories", "instruments"] as const).map(s => (
          <Pressable
            key={s}
            onPress={() => setSection(s)}
            style={[styles.segTab, section === s && { backgroundColor: isDark ? "#3A3A3C" : "#FFF", borderRadius: 8 }]}
          >
            <Text style={[styles.segTabText, {
              color: section === s ? colors.text : colors.textSecondary,
              fontFamily: section === s ? "Inter_600SemiBold" : "Inter_400Regular",
            }]}>
              {s === "institutions" ? "Istituti" : s === "categories" ? "Categorie" : "Strumenti"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refInst(); refCat(); refSub(); refInstr(); }} tintColor={colors.tint} />}
      >
        {/* ISTITUTI */}
        {secInst && (
          <>
            <Pressable
              onPress={() => setModal({ type: "institution" })}
              style={({ pressed }) => [styles.addRow, { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="plus-circle" size={20} color={colors.tint} />
              <Text style={[styles.addRowText, { color: colors.tint, fontFamily: "Inter_500Medium" }]}>Aggiungi istituto</Text>
            </Pressable>
            {institutions?.map(inst => (
              <View key={inst.id} style={[styles.listRow, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
                <View style={[styles.colorDot, { backgroundColor: inst.color ?? "#8E8E93" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{inst.name}</Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {INST_TYPE_LABELS[inst.type] ?? inst.type} · Saldo iniziale: €{parseFloat(inst.initialBalance).toFixed(2)}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDelete(inst.name, () => deleteInst.mutate(inst.id))} style={{ padding: 8 }}>
                  <Feather name="trash-2" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
            {!institutions?.length && (
              <EmptyState icon="bank" title="Nessun istituto" subtitle='Aggiungi banche, broker, ecc.' />
            )}
          </>
        )}

        {/* CATEGORIE */}
        {secCat && (
          <>
            <Pressable
              onPress={() => setModal({ type: "category" })}
              style={({ pressed }) => [styles.addRow, { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="plus-circle" size={20} color={colors.tint} />
              <Text style={[styles.addRowText, { color: colors.tint, fontFamily: "Inter_500Medium" }]}>Aggiungi categoria</Text>
            </Pressable>
            {categories?.map(cat => (
              <View key={cat.id}>
                <View style={[styles.listRow, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color ?? "#8E8E93" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{cat.name}</Text>
                    <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                      {subcategories?.filter(s => s.categoryId === cat.id).map(s => s.name).join(", ") || "Nessuna sottocategoria"}
                    </Text>
                  </View>
                  <Pressable onPress={() => { setSubCatId(cat.id); setModal({ type: "subcategory" }); }} style={{ padding: 8 }}>
                    <Feather name="plus" size={18} color={colors.tint} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(cat.name, () => deleteCat.mutate(cat.id))} style={{ padding: 8 }}>
                    <Feather name="trash-2" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
                {/* Subcategories */}
                {subcategories?.filter(s => s.categoryId === cat.id).map(sub => (
                  <View key={sub.id} style={[styles.subRow, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
                    <Text style={[styles.subBullet, { color: colors.textSecondary }]}>  ↳</Text>
                    <Text style={[styles.subName, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{sub.name}</Text>
                    <Pressable onPress={() => confirmDelete(sub.name, () => deleteSub.mutate(sub.id))} style={{ padding: 8 }}>
                      <Feather name="x" size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ))}
            {!categories?.length && (
              <EmptyState icon="tag" title="Nessuna categoria" subtitle="Aggiungi categorie per organizzare le spese" />
            )}
          </>
        )}

        {/* STRUMENTI */}
        {secInstr && (
          <>
            <Pressable
              onPress={() => setModal({ type: "instrument" })}
              style={({ pressed }) => [styles.addRow, { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="plus-circle" size={20} color={colors.tint} />
              <Text style={[styles.addRowText, { color: colors.tint, fontFamily: "Inter_500Medium" }]}>Aggiungi strumento</Text>
            </Pressable>
            {instruments?.map(instr => (
              <View key={instr.id} style={[styles.listRow, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                    {instr.ticker} — {instr.name}
                  </Text>
                  <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {instr.type} · {instr.currency ?? "EUR"}
                  </Text>
                </View>
                <Pressable onPress={() => confirmDelete(instr.ticker, () => deleteInstr.mutate(instr.id))} style={{ padding: 8 }}>
                  <Feather name="trash-2" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
            {!instruments?.length && (
              <EmptyState icon="trending-up" title="Nessuno strumento" subtitle="Aggiungi ETF, azioni, crypto, ecc." />
            )}
          </>
        )}
      </ScrollView>

      {/* Institution modal */}
      <Modal visible={modal.type === "institution"} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Nuovo Istituto</Text>
              <Pressable onPress={() => { setModal({ type: null }); resetInstForm(); }}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput style={inputStyle} value={instName} onChangeText={setInstName} placeholder="es. Fineco" placeholderTextColor={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
            <View style={styles.pillRow}>
              {INSTITUTION_TYPES.map(t => (
                <Pressable key={t} onPress={() => setInstType(t)}
                  style={[styles.pill, { backgroundColor: instType === t ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
                >
                  <Text style={[styles.pillText, { color: instType === t ? "#FFF" : colors.text }]}>{INST_TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Saldo iniziale (€)</Text>
            <TextInput style={inputStyle} value={instBal} onChangeText={setInstBal} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Colore</Text>
            <View style={styles.colorRow}>
              {PALETTE.map(c => (
                <Pressable key={c} onPress={() => setInstColor(c)}
                  style={[styles.colorSwatch, { backgroundColor: c, borderWidth: instColor === c ? 3 : 0, borderColor: "#FFF" }]}
                />
              ))}
            </View>
            <Pressable
              onPress={() => createInst.mutate({ name: instName, type: instType, initialBalance: instBal, color: instColor })}
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>Salva</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Category modal */}
      <Modal visible={modal.type === "category"} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Nuova Categoria</Text>
              <Pressable onPress={() => { setModal({ type: null }); resetCatForm(); }}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput style={inputStyle} value={catName} onChangeText={setCatName} placeholder="es. Alimentari" placeholderTextColor={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Colore</Text>
            <View style={styles.colorRow}>
              {PALETTE.map(c => (
                <Pressable key={c} onPress={() => setCatColor(c)}
                  style={[styles.colorSwatch, { backgroundColor: c, borderWidth: catColor === c ? 3 : 0, borderColor: "#FFF" }]}
                />
              ))}
            </View>
            <Pressable
              onPress={() => createCat.mutate({ name: catName, color: catColor, icon: catIcon })}
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>Salva</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Subcategory modal */}
      <Modal visible={modal.type === "subcategory"} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Nuova Sottocategoria</Text>
              <Pressable onPress={() => { setModal({ type: null }); resetSubForm(); }}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput style={inputStyle} value={subName} onChangeText={setSubName} placeholder="es. Pranzo fuori" placeholderTextColor={colors.textSecondary} />
            <Pressable
              onPress={() => subCatId && createSub.mutate({ name: subName, categoryId: subCatId })}
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>Salva</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Instrument modal */}
      <Modal visible={modal.type === "instrument"} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Nuovo Strumento</Text>
              <Pressable onPress={() => { setModal({ type: null }); resetInstrForm(); }}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Ticker</Text>
            <TextInput style={inputStyle} value={instrTicker} onChangeText={t => setInstrTicker(t.toUpperCase())} placeholder="es. VWCE" placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput style={inputStyle} value={instrName} onChangeText={setInstrName} placeholder="es. Vanguard All-World" placeholderTextColor={colors.textSecondary} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
            <View style={styles.pillRow}>
              {INSTRUMENT_TYPES.map(t => (
                <Pressable key={t} onPress={() => setInstrType(t)}
                  style={[styles.pill, { backgroundColor: instrType === t ? colors.tint : (isDark ? "#2C2C2E" : "#E5E5EA") }]}
                >
                  <Text style={[styles.pillText, { color: instrType === t ? "#FFF" : colors.text }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Valuta</Text>
            <TextInput style={inputStyle} value={instrCurrency} onChangeText={t => setInstrCurrency(t.toUpperCase())} placeholder="EUR" placeholderTextColor={colors.textSecondary} />
            <Pressable
              onPress={() => createInstr.mutate({ ticker: instrTicker, name: instrName, type: instrType, currency: instrCurrency })}
              style={[styles.submitBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>Salva</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  segmented: {
    flexDirection: "row", marginHorizontal: 16, borderRadius: 10, padding: 2, marginBottom: 8,
  },
  segTab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  segTabText: { fontSize: 13 },
  addRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
    marginHorizontal: 0, borderRadius: 0,
  },
  addRowText: { fontSize: 16 },
  listRow: {
    flexDirection: "row", alignItems: "center", padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, paddingLeft: 32,
  },
  subBullet: { fontSize: 14, marginRight: 4 },
  subName: { flex: 1, fontSize: 14 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  listTitle: { fontSize: 16 },
  listSub: { fontSize: 13, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 14, letterSpacing: 0.2 },
  input: {
    borderRadius: 10, padding: 14, fontSize: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  pillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  submitBtn: {
    marginTop: 24, padding: 16, borderRadius: 14, alignItems: "center",
  },
  submitText: { color: "#FFF", fontSize: 17 },
});
