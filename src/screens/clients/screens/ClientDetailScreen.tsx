import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  useRoute,
  RouteProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ITScreenWrapper,
  ITText,
  ITTouchableOpacity,
  ITBadge,
} from '../../../shared/components';
import { ClientStackParamList } from '../stack/ClientStack';
import { getClientById } from '../service/client.service';
import { IClient } from '../service/client.types';
import { showToast } from '../../../core/store/slices/toast.slice';
import { getPaginatedLocations } from '../../locations/service/location.service';
import { getPaginatedZones } from '../../zones/service/zone.service';
import { getPaginatedUsers } from '../../users/service/user.service';

import { theme } from '../../../shared/theme/theme';

type ClientDetailRouteProp = RouteProp<ClientStackParamList, 'CLIENT_DETAIL'>;

const ClientDetailSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonInfo}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBadge} />
          </View>
        </View>
        <View style={styles.skeletonDivider} />
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
      </View>
      <View style={styles.skeletonMenu}>
        <View style={styles.skeletonMenuItem} />
        <View style={styles.skeletonMenuItem} />
        <View style={styles.skeletonMenuItem} />
      </View>
    </View>
  );
};

export const ClientDetailScreen = () => {
  const route = useRoute<ClientDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { id } = route.params;
  const dispatch = useDispatch();

  const [client, setClient] = useState<IClient | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const [clientRes, locationsRes, zonesRes, guardsRes] = await Promise.all([
        getClientById(id),
        getPaginatedLocations({ page: 1, limit: 1, filters: { clientId: id } }),
        getPaginatedZones({ page: 1, limit: 1, filters: { clientId: id } }),
        getPaginatedUsers({ page: 1, limit: 1, filters: { clientId: id } }),
      ]);

      if (clientRes.success && clientRes.data) {
        const clientData = clientRes.data;

        clientData._count = {
          locations: locationsRes.success ? locationsRes.data?.total || 0 : 0,
          zones: zonesRes.success ? zonesRes.data?.total || 0 : 0,
          users: guardsRes.success ? guardsRes.data?.total || 0 : 0,
          ...clientData._count,
        };

        setClient(clientData);
      } else {
        dispatch(
          showToast({
            message: clientRes.messages?.[0] || 'Error al cargar',
            type: 'error',
          }),
        );
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error inesperado', type: 'error' }));
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClient();
    }, [id]),
  );

  const renderMenuItem = (
    title: string,
    icon: string,
    routeName: string,
    description?: string,
  ) => (
    <ITTouchableOpacity
      style={styles.menuItem}
      onPress={() => navigation.navigate(routeName, { clientId: id })}
    >
      <View style={styles.menuIconContainer}>
        <Icon source={icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <ITText variant="titleMedium" style={styles.menuTitle}>
          {title}
        </ITText>
        {description && (
          <ITText variant="labelSmall" style={styles.menuDescription}>
            {description}
          </ITText>
        )}
      </View>
      <Icon source="chevron-right" size={20} color="#CBD5E1" />
    </ITTouchableOpacity>
  );

  return (
    <ITScreenWrapper scrollable={!loading} backgroundColor="#F8FAFC">
      {loading ? (
        <ClientDetailSkeleton />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {client && (
            <>
              <ITTouchableOpacity>
                <View style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                      <ITText style={styles.avatarText}>
                        {client.name?.charAt(0).toUpperCase()}
                      </ITText>
                    </View>

                    <View style={styles.profileInfo}>
                      <ITText variant="titleLarge" style={styles.profileName}>
                        {client.name}
                      </ITText>
                      <View style={styles.statusContainer}>
                        <ITBadge
                          label={client.active ? 'Activo' : 'Inactivo'}
                          variant={client.active ? 'success' : 'error'}
                          size="small"
                          dot={client.active}
                        />
                      </View>
                    </View>

                    <ITTouchableOpacity
                      style={styles.editButton}
                      onPress={() => navigation.navigate('CLIENT_FORM', { id })}
                    >
                      <Icon
                        source="pencil-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                    </ITTouchableOpacity>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <Icon
                        source="file-document-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <View style={styles.infoTextContainer}>
                        <ITText variant="labelSmall" style={styles.infoLabel}>
                          RFC
                        </ITText>
                        <ITText variant="bodySmall" style={styles.infoValue}>
                          {client.rfc || 'N/A'}
                        </ITText>
                      </View>
                    </View>

                    <View style={styles.infoCard}>
                      <Icon
                        source="account-tie-outline"
                        size={18}
                        color="#F59E0B"
                      />
                      <View style={styles.infoTextContainer}>
                        <ITText variant="labelSmall" style={styles.infoLabel}>
                          Contacto
                        </ITText>
                        <ITText variant="bodySmall" style={styles.infoValue}>
                          {client.contactName || 'N/A'}
                        </ITText>
                      </View>
                    </View>

                    <View style={styles.infoCard}>
                      <Icon source="email-outline" size={18} color="#10B981" />
                      <View style={styles.infoTextContainer}>
                        <ITText variant="labelSmall" style={styles.infoLabel}>
                          Email
                        </ITText>
                        <ITText variant="bodySmall" style={styles.infoValue}>
                          {client.email || 'N/A'}
                        </ITText>
                      </View>
                    </View>

                    <View style={styles.infoCard}>
                      <Icon
                        source="phone-outline"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <View style={styles.infoTextContainer}>
                        <ITText variant="labelSmall" style={styles.infoLabel}>
                          Teléfono
                        </ITText>
                        <ITText variant="bodySmall" style={styles.infoValue}>
                          {client.contactPhone || 'N/A'}
                        </ITText>
                      </View>
                    </View>
                  </View>

                  {client.address && (
                    <View style={styles.addressSection}>
                      <Icon
                        source="map-marker-outline"
                        size={18}
                        color={theme.colors.slate500}
                      />
                      <ITText variant="bodySmall" style={styles.addressText}>
                        {client.address}
                      </ITText>
                    </View>
                  )}
                </View>
              </ITTouchableOpacity>

              <View style={styles.menuSection}>
                <View style={styles.sectionHeader}>
                  <ITText
                    variant="labelLarge"
                    weight="bold"
                    style={styles.sectionTitle}
                  >
                    Gestión de Empresa
                  </ITText>
                  <View style={styles.sectionLine} />
                </View>

                <View style={styles.menuList}>
                  {renderMenuItem(
                    'Ubicaciones',
                    'map-marker-radius-outline',
                    'CLIENT_LOCATIONS',
                    `${client._count?.locations || 0} ubicaciones registradas`,
                  )}
                  {renderMenuItem(
                    'Zonas de Recorrido',
                    'layers-outline',
                    'CLIENT_ZONES',
                    `${client._count?.zones || 0} zonas configuradas`,
                  )}
                  {renderMenuItem(
                    'Guardias Asignados',
                    'shield-account-outline',
                    'CLIENT_GUARDS',
                    `${client._count?.users || 0} guardias asignados`,
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonTitle: {
    width: 150,
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: -20,
    marginBottom: 16,
  },
  skeletonRow: {
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
  },
  skeletonMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  skeletonMenuItem: {
    height: 72,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: theme.colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '700',
    color: theme.colors.slate900,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: theme.colors.slate500,
    fontSize: 10,
    marginBottom: 2,
  },
  infoValue: {
    color: theme.colors.slate900,
    fontSize: 12,
    fontWeight: '500',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  addressText: {
    flex: 1,
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    color: theme.colors.slate900,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  menuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: '600',
    color: theme.colors.slate900,
    fontSize: 15,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  menuDescription: {
    color: '#94A3B8',
    fontSize: 11,
  },
});
