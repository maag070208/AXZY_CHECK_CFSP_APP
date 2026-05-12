import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View, Alert, ScrollView } from 'react-native';
import {
  ActivityIndicator,
  Checkbox,
  IconButton,
  Searchbar,
  Icon,
} from 'react-native-paper';
import { getLocations } from '../service/location.service';
import { ILocation } from '../type/location.types';
import {
  ITButton,
  ITCard,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../shared/theme/theme';

export const BulkPrintScreen = () => {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const res = await getLocations();
    if (res.success && res.data) {
      setLocations(res.data);
    }
    setLoading(false);
  };

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredLocations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLocations.map(l => l.id));
    }
  };

  const handleGeneratePDF = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Atención', 'Selecciona al menos una ubicación');
      return;
    }

    setIsGenerating(true);
    try {
      // Logic to generate PDF
      Alert.alert(
        'Éxito',
        `Se han seleccionado ${selectedIds.length} puntos para generación de QR masivo.`,
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el archivo para impresión.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <ITText variant="headlineSmall" weight="800" style={styles.title}>
          Impresión Masiva
        </ITText>
        <ITText
          variant="bodySmall"
          color={theme.colors.slate500}
          style={styles.subtitle}
        >
          Selecciona los puntos de control para generar códigos QR
        </ITText>

        <Searchbar
          placeholder="Filtrar por nombre..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />

        <View style={styles.selectionRow}>
          <View style={styles.selectionCount}>
            <Icon
              source="checkbox-marked-circle-outline"
              size={18}
              color={theme.colors.primary}
            />
            <ITText
              variant="labelMedium"
              weight="700"
              style={{ color: theme.colors.primary }}
            >
              {selectedIds.length} seleccionados
            </ITText>
          </View>
          <ITTouchableOpacity onPress={handleSelectAll}>
            <ITText
              variant="labelMedium"
              weight="800"
              color={theme.colors.primary}
            >
              {selectedIds.length === filteredLocations.length
                ? 'DESMARCAR TODOS'
                : 'SELECCIONAR TODOS'}
            </ITText>
          </ITTouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <ITText
            variant="bodySmall"
            color={theme.colors.slate500}
            style={{ marginTop: 12 }}
          >
            Cargando ubicaciones...
          </ITText>
        </View>
      ) : (
        <FlatList
          data={filteredLocations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <ITCard
                style={[styles.card, isSelected && styles.selectedCard]}
                onPress={() => toggleSelection(item.id)}
                mode="elevated"
              >
                <View style={styles.cardContent}>
                  <Checkbox.Android
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => toggleSelection(item.id)}
                    color={theme.colors.primary}
                  />
                  <View style={styles.info}>
                    <ITText
                      variant="titleMedium"
                      weight="700"
                      color={isSelected ? theme.colors.primary : '#1E293B'}
                    >
                      {item.name}
                    </ITText>
                    <View style={styles.detailsRow}>
                      <Icon
                        source="identifier"
                        size={14}
                        color={theme.colors.slate500}
                      />
                      <ITText variant="bodySmall" color={theme.colors.slate500}>
                        ID: {item.id.substring(0, 8)}...
                      </ITText>
                      <View style={styles.dot} />
                      <Icon
                        source="map-marker-outline"
                        size={14}
                        color={theme.colors.slate500}
                      />
                      <ITText variant="bodySmall" color={theme.colors.slate500}>
                        {(item as any).zone?.name || 'General'}
                      </ITText>
                    </View>
                  </View>
                </View>
              </ITCard>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                source="magnify-close"
                size={48}
                color={theme.colors.primary}
              />
              <ITText
                variant="bodyMedium"
                color={theme.colors.slate500}
                style={{ marginTop: 12 }}
              >
                No se encontraron puntos
              </ITText>
            </View>
          }
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <ITButton
          label={`GENERAR PDF DE QR (${selectedIds.length})`}
          mode="contained"
          onPress={handleGeneratePDF}
          loading={isGenerating}
          disabled={selectedIds.length === 0}
          style={styles.printButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    color: '#1E293B',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 15,
    minHeight: 0,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F5F3FF',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  info: {
    marginLeft: 8,
    flex: 1,
    gap: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.slate300,
    marginHorizontal: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  printButton: {
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
  },
});
