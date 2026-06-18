import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { ITButton, ITCategorySelector, ITInput, ITMediaPicker, ITText, ITTypeSelector, MediaItem } from '../../../shared/components';
import { SearchComponent, SearchOption } from '../../../shared/components/SearchComponent';
import { getCatalog } from '../../../shared/service/catalog.service';
import { createDiscipline, getPaginatedGuards } from '../service/GuardDisciplineService';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
}

export const GuardDisciplineFormModal = ({ visible, onDismiss, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [allTypes, setAllTypes] = useState<any[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const [selectedGuardId, setSelectedGuardId] = useState<string | number>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      try {
        const [catRes, typeRes] = await Promise.all([
          getCatalog('discipline_category'),
          getCatalog('discipline_type'),
        ]);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (typeRes.success && typeRes.data) {
          setAllTypes(typeRes.data);
          setFilteredTypes(typeRes.data);
        }

        const guardRes = await getPaginatedGuards({
          page: 1,
          limit: 200,
          filters: {},
        });
        if (guardRes.success) setGuards(guardRes.data?.rows || []);
      } catch (e: any) {
        console.error('[GuardDisciplineForm] Error loading data:', e);
      }
    };
    load();
  }, [visible]);

  const guardOptions: SearchOption[] = guards.map((g: any) => ({
    label: `${g.name} ${g.lastName ?? ''} (@${g.username})`.toUpperCase(),
    value: g.id,
  }));

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    const filtered = allTypes.filter((t: any) => String(t.categoryId) === String(catId));
    setFilteredTypes(filtered);
    setSelectedTypeId(null);
  };

  const handleSubmit = async () => {
    const selectedType = allTypes.find((t: any) => t.id === selectedTypeId);
    console.log('[GuardDiscipline] Submit values:', {
      selectedGuardId,
      selectedCategoryId,
      selectedTypeId,
      description,
      mediaCount: media.length,
    });
    const missing: string[] = [];
    if (!selectedGuardId) missing.push('Guardia');
    if (!selectedCategoryId) missing.push('Categoría');
    if (!selectedTypeId) missing.push('Tipo');
    if (missing.length > 0) {
      dispatch(showToast({ message: `Campos obligatorios: ${missing.join(', ')}`, type: 'error' }));
      return;
    }
    setLoading(true);
    try {
      const mediaUrls: { url: string; type: string }[] = media
        .filter((m): m is MediaItem & { url: string } => !!m.url && !m.error)
        .map((m) => ({ url: m.url, type: m.type }));

      await createDiscipline({
        guardId: String(selectedGuardId),
        title: selectedType?.value || 'Incidencia a Guardia',
        description: description.trim() || null,
        categoryId: selectedCategoryId!,
        typeId: selectedTypeId!,
        clientId: user.clientId || null,
        media: mediaUrls,
      });
      dispatch(showToast({ message: 'Incidencia registrada correctamente', type: 'success' }));
      onSuccess();
      onDismiss();
      resetForm();
    } catch (err: any) {
      dispatch(showToast({ message: err?.message || 'Error al registrar', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedGuardId('');
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setDescription('');
    setMedia([]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onDismiss={onDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      >
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onDismiss} style={styles.headerBack}>
              <Icon source="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <ITText style={styles.headerTitle}>Nueva Incidencia</ITText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SearchComponent
              label="GUARDIA"
              value={selectedGuardId}
              options={guardOptions}
              onSelect={setSelectedGuardId}
              placeholder="Buscar guardia..."
              searchPlaceholder="Buscar por nombre o usuario..."
            />

            <ITCategorySelector
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={handleCategorySelect}
              label="CATEGORÍA"
            />
            {categories.length === 0 && (
              <View style={styles.emptyCat}>
                <Icon source="alert-circle-outline" size={18} color="#94A3B8" />
                <ITText style={styles.emptyCatText}>
                  No hay categorías disponibles. Créalas en Catálogos → Categorías de Incidencias
                </ITText>
              </View>
            )}

            {selectedCategoryId && (
              <>
                <ITTypeSelector
                  types={filteredTypes}
                  selectedId={selectedTypeId}
                  onSelect={setSelectedTypeId}
                  label="TIPO DE INCIDENCIA"
                />
                {filteredTypes.length === 0 && (
                  <View style={styles.emptyCat}>
                    <Icon source="alert-circle-outline" size={18} color="#94A3B8" />
                    <ITText style={styles.emptyCatText}>
                      No hay tipos para esta categoría. Créalos en Catálogos → Tipos de Incidencias
                    </ITText>
                  </View>
                )}
              </>
            )}

            <ITMediaPicker
              media={media}
              onMediaChange={setMedia}
              uploadPath="guard-discipline"
            />

            <ITInput
              label="OBSERVACIONES"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe los detalles de la incidencia..."
              multiline
              numberOfLines={4}
            />
          </ScrollView>

          <View style={styles.footer}>
            <ITButton onPress={onDismiss} mode="outlined" style={styles.footerBtn}>
              Cancelar
            </ITButton>
            <ITButton onPress={handleSubmit} loading={loading} style={styles.footerBtn}>
              Guardar
            </ITButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerBtn: {
    flex: 1,
  },
  emptyCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  emptyCatText: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 16,
  },
});
