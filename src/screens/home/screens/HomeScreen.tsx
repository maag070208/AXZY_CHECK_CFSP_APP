import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import { Icon, useTheme, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { ITScreenWrapper, ITText } from '../../../shared/components';
import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import { getDashboardStats } from '../../home/service/home.service';
import { HomeItemComponent } from '../components/HomeItemComponent';
import { IActiveRound } from '../types/HomeTypes';
import { GuardDashboard } from './GuardDashboard';
import { theme } from '../../../shared/theme/theme';

const { width } = Dimensions.get('window');

const GRID_PADDING = 20;
const ITEM_MARGIN = 5;
const CARD_WIDTH = (width - GRID_PADDING * 2 - ITEM_MARGIN * 6) / 3;

// Skeleton animado moderno
const AnimatedSkeletonLoader = () => {
  const theme = useTheme() as any;
  const [fadeAnim] = useState(new Animated.Value(0.3));

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const SkeletonBlock = ({
    width: w,
    height: h,
    borderRadius = 12,
    style = {},
  }) => (
    <Animated.View
      style={[
        {
          width: w,
          height: h,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <SkeletonBlock width={200} height={28} borderRadius={8} />
        <SkeletonBlock
          width={140}
          height={14}
          borderRadius={6}
          style={{ marginTop: 8 }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 20,
          gap: 12,
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <SkeletonBlock width="30%" height={56} borderRadius={16} />
        <SkeletonBlock width="30%" height={56} borderRadius={16} />
        <SkeletonBlock width="30%" height={56} borderRadius={16} />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <SkeletonBlock width={120} height={20} borderRadius={6} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 20,
          gap: 12,
          marginBottom: 28,
        }}
      >
        <SkeletonBlock width={120} height={88} borderRadius={20} />
        <SkeletonBlock width={120} height={88} borderRadius={20} />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <SkeletonBlock width={140} height={20} borderRadius={6} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: GRID_PADDING,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={{
              width: '33.33%',
              paddingHorizontal: ITEM_MARGIN,
              marginBottom: 12,
            }}
          >
            <SkeletonBlock width="100%" height={96} borderRadius={20} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export const HomeScreen = () => {
  const user = useSelector((state: RootState) => state.userState);
  const theme = useTheme() as any;
  const dispatch = useDispatch();

  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [pendingMaintenance, setPendingMaintenance] = useState(0);
  const [activeRounds, setActiveRounds] = useState<IActiveRound[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.RESDN) {
    return <GuardDashboard />;
  }

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setLoading(true);

    try {
      const response = await getDashboardStats();

      if (!response.success) {
        dispatch(
          showToast({
            type: 'error',
            message: response.messages?.[0] || 'Error al cargar estadísticas',
          }),
        );
        return;
      }

      if (response.data) {
        setPendingIncidents(response.data.pendingIncidentsCount);
        setPendingMaintenance(response.data.pendingMaintenanceCount);
        setActiveRounds(response.data.activeRounds);
      }
    } catch (error) {
      const result = error as TResult<void>;
      dispatch(
        showToast({
          type: 'error',
          message: result?.messages?.[0] || 'Ocurrió un error en la solicitud',
        }),
      );
    } finally {
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 600);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      return () => setLoading(true);
    }, [user.role]),
  );

  const MODULES = [
    {
      id: 'users',
      label: 'Usuarios',
      icon: 'account-plus',
      stack: 'USERS_STACK',
      screen: 'USER_LIST',
      color: theme.colors.primary,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'guards',
      label: 'Guardias',
      icon: 'shield-check',
      stack: 'GUARDS_STACK',
      screen: 'GUARD_LIST',
      color: theme.colors.primary,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'incidents',
      label: 'Alertas',
      icon: 'alert-rhombus',
      stack: 'INCIDENTS_STACK',
      screen: 'INCIDENT_LIST',
      color: '#EF4444',
      roles: [UserRole.ADMIN],
      badge: pendingIncidents,
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: 'wrench',
      stack: 'MAINTENANCE_STACK',
      screen: 'MAINTENANCE_LIST',
      color: '#F59E0B',
      roles: [UserRole.ADMIN],
      badge: pendingMaintenance,
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: 'office-building',
      stack: 'CLIENTS_STACK',
      screen: 'CLIENT_LIST',
      color: '#0EA5E9',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'locations',
      label: 'Puntos',
      icon: 'map-marker',
      stack: 'LOCATIONS_STACK',
      screen: 'LOCATIONS_MAIN',
      color: '#10B981',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'recurring',
      label: 'Rutas',
      icon: 'repeat',
      stack: 'RECURRING_STACK',
      screen: 'RECURRING_LIST',
      color: theme.colors.primary,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'rounds_history',
      label: 'Recorridos',
      icon: 'map-marker-distance',
      stack: 'ROUNDS_STACK',
      screen: 'ROUNDS_LIST',
      color: '#64748B',
      roles: [UserRole.ADMIN, UserRole.RESDN],
    },
    {
      id: 'schedules',
      label: 'Horarios',
      icon: 'calendar-clock',
      stack: 'SCHEDULES_STACK',
      screen: 'SCHEDULES_LIST',
      color: '#F59E0B',
      roles: [UserRole.ADMIN],
    },
    {
      id: 'zones',
      label: 'Zonas',
      icon: 'layers-outline',
      stack: 'ZONES_STACK',
      screen: 'ZONES_MAIN',
      color: '#EC4899',
      roles: [UserRole.ADMIN],
    },
  ];

  const filteredModules = MODULES.filter(m =>
    m.roles.includes(user.role as UserRole),
  );

  if (loading) {
    return (
      <ITScreenWrapper
        scrollable={false}
        padding={false}
        style={styles.container}
      >
        <AnimatedSkeletonLoader />
      </ITScreenWrapper>
    );
  }

  return (
    <ITScreenWrapper
      scrollable={false}
      padding={false}
      style={styles.container}
      roundedTop
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(true)}
          />
        }
      >
        {/* We overlap the HeaderMain by pushing the first element up slightly */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Icon source="walk" size={24} color={theme.colors.primary} />
            <ITText weight="bold" style={styles.statNumber}>
              {activeRounds.length}
            </ITText>
            <ITText style={styles.statLabel}>Rondas</ITText>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
            <Icon source="alert-circle-outline" size={24} color="#EF4444" />
            <ITText
              weight="bold"
              style={[styles.statNumber, { color: '#EF4444' }]}
            >
              {pendingIncidents}
            </ITText>
            <ITText style={styles.statLabel}>Alertas</ITText>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
            <Icon source="tools" size={24} color="#F59E0B" />
            <ITText weight="bold" style={styles.statNumber}>
              {pendingMaintenance}
            </ITText>
            <ITText style={styles.statLabel}>Mantenimiento</ITText>
          </View>
        </View>

        {/* {activeRounds.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ITText variant="labelLarge" weight="bold">
                Personal en Ronda
              </ITText>
              <ITText variant="labelSmall" style={styles.seeAll}>
                Ver todos
              </ITText>
            </View>
            <FlatList
              data={activeRounds}
              renderItem={({ item }) => (
                <View style={styles.roundCard}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <ITText
                      variant="labelSmall"
                      weight="bold"
                      style={styles.liveText}
                    >
                      EN VIVO
                    </ITText>
                  </View>
                  <ITText variant="bodySmall" weight="bold" numberOfLines={1}>
                    {item.guard?.name}
                  </ITText>
                  <ITText
                    variant="labelSmall"
                    style={styles.clientName}
                    numberOfLines={1}
                  >
                    {item.client?.name}
                  </ITText>
                </View>
              )}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            />
          </View>
        )} */}

        <View style={[styles.section, { marginTop: 8, marginBottom: 24 }]}>
          <View style={styles.sectionHeader}>
            <ITText variant="labelLarge" weight="bold">
              Accesos Rápidos
            </ITText>
          </View>
          <View style={styles.modulesGrid}>
            {filteredModules.map(item => (
              <View key={item.id} style={styles.moduleItem}>
                <HomeItemComponent {...item} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    letterSpacing: -0.3,
    color: '#0F172A',
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 22,
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seeAll: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  roundCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 18,
    width: 130,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#10B981',
    fontSize: 9,
  },
  clientName: {
    opacity: 0.5,
    marginTop: 2,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -ITEM_MARGIN,
  },
  moduleItem: {
    width: '33.33%',
    paddingHorizontal: ITEM_MARGIN,
    marginBottom: 12,
  },
});
