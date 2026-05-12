import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Portal, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import {
  ITText,
  ITButton,
  SearchComponent,
  ITBadge,
} from '../../../shared/components';
import { getClients } from '../../clients/service/client.service';
import { getZonesByClient } from '../../zones/service/zone.service';
import { getPaginatedLocations } from '../service/location.service';
import { handleLocationQRPrint } from '../utils/qr.utils';
import { showToast } from '../../../core/store/slices/toast.slice';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { theme } from '../../../shared/theme/theme';

import { ILocation } from '../type/location.types';

interface BulkPrintModalProps {
  visible: boolean;
  onDismiss: () => void;
  initialClientId?: string | number;
}

export const BulkPrintModal: React.FC<BulkPrintModalProps> = ({
  visible,
  onDismiss,
  initialClientId,
}) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const [clients, setClients] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string | number>(
    initialClientId || '',
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string | number>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadClients();
      if (initialClientId) {
        setSelectedClientId(initialClientId);
      }
    }
  }, [visible, initialClientId]);

  useEffect(() => {
    if (selectedClientId) {
      loadZones(selectedClientId);
    } else {
      setZones([]);
      setSelectedZoneId('');
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const res = await getClients();
      if (res.success) setClients(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadZones = async (clientId: string | number) => {
    try {
      const res = await getZonesByClient(clientId);
      if (res.success) setZones(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = async () => {
    if (!selectedClientId) {
      dispatch(showToast({ message: 'Selecciona un cliente', type: 'error' }));
      return;
    }

    setLoading(true);
    dispatch(showLoader(true));

    try {
      const res = await getPaginatedLocations({
        page: 1,
        limit: 1000,
        filters: {
          clientId: selectedClientId,
          zoneId: selectedZoneId || undefined,
          active: true,
        },
      });

      if (res.success && res.data?.rows) {
        const ids = res.data.rows.map((l: ILocation) => l.id);
        if (ids.length === 0) {
          dispatch(
            showToast({
              message: 'No hay ubicaciones para estos filtros',
              type: 'warning',
            }),
          );
        } else {
          const success = await handleLocationQRPrint(
            ids,
            'Impresion_Masiva_QRs',
          );
          if (success) {
            onDismiss();
          } else {
            dispatch(
              showToast({ message: 'Error al generar PDF', type: 'error' }),
            );
          }
        }
      }
    } catch (error) {
      console.error(error);
      dispatch(showToast({ message: 'Error en la solicitud', type: 'error' }));
    } finally {
      setLoading(false);
      dispatch(showLoader(false));
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.header}>
          <ITText variant="headlineSmall" weight="bold">
            Impresión Masiva
          </ITText>
          <IconButton icon="close" onPress={onDismiss} />
        </View>

        <View style={styles.content}>
          <ITText variant="bodyMedium" style={styles.description}>
            Selecciona los criterios para generar los códigos QR en bloque.
          </ITText>

          <View style={styles.field}>
            <ITText variant="labelMedium" weight="bold" style={styles.label}>
              CLIENTE
            </ITText>
            <SearchComponent
              placeholder="Seleccionar Cliente"
              options={clients.map(c => ({ label: c.name, value: c.id }))}
              value={selectedClientId}
              onSelect={val => {
                setSelectedClientId(val);
                setSelectedZoneId('');
              }}
            />
          </View>

          <View style={styles.field}>
            <ITText variant="labelMedium" weight="bold" style={styles.label}>
              ZONA (OPCIONAL)
            </ITText>
            <SearchComponent
              placeholder={
                selectedClientId
                  ? 'Todas las zonas'
                  : 'Selecciona cliente primero'
              }
              options={zones.map(z => ({ label: z.name, value: z.id }))}
              value={selectedZoneId}
              onSelect={setSelectedZoneId}
              disabled={!selectedClientId}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <ITButton
            label="Generar QRs"
            mode="contained"
            onPress={handlePrint}
            loading={loading}
            style={styles.printBtn}
            icon="qrcode"
          />
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  content: {
    gap: 20,
  },
  description: {
    color: theme.colors.slate500,
    marginBottom: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    color: theme.colors.slate500,
    letterSpacing: 1,
  },
  footer: {
    marginTop: 32,
  },
  printBtn: {
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
});
