import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useAppDispatch, useAppSelector } from '../../core/store/hooks';
import { logout } from '../../core/store/slices/user.slice';
import { logout as logoutApi } from '../../screens/auth/services/AuthService';
import { RootState } from '../../core/store/redux.config';
import { getCurrentRound } from '../../screens/home/service/round.service';
import { ITAlert } from '../../shared/components';
import { theme } from '../../shared/theme/theme';

/* ======================================================
   TYPES
====================================================== */
type Role = 'ADMIN' | 'SHIFT' | 'GUARD' | 'MAINT' | 'RESDN';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  screen: string;
  roles: Role[];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Turno',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Usuario',
};

/* ======================================================
   MENU CONFIG
====================================================== */
const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Inicio',
    icon: 'home-outline',
    route: 'Tabs',
    screen: 'HOME_STACK',
    roles: ['ADMIN', 'SHIFT', 'GUARD', 'MAINT', 'RESDN'],
  },
  {
    label: 'Guardias',
    icon: 'shield-check',
    route: 'GUARDS_STACK',
    screen: 'GUARD_LIST',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Mis Asignaciones',
    icon: 'clipboard-list-outline',
    route: 'ASSIGNMENTS_STACK',
    screen: 'MY_ASSIGNMENTS_MAIN',
    roles: ['GUARD', 'MAINT'],
  },
  {
    label: 'Usuarios',
    icon: 'account-plus',
    route: 'USERS_STACK',
    screen: 'USER_LIST',
    roles: ['ADMIN'],
  },
  {
    label: 'Historial',
    icon: 'history',
    route: 'Tabs',
    screen: 'Kardex',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Incidencias',
    icon: 'alert-circle-outline',
    route: 'INCIDENTS_STACK',
    screen: 'INCIDENT_LIST',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Mantenimiento',
    icon: 'wrench-outline',
    route: 'MAINTENANCE_STACK',
    screen: 'MAINTENANCE_LIST',
    roles: ['ADMIN', 'MAINT'],
  },
  {
    label: 'Recorridos',
    icon: 'map-marker-distance',
    route: 'ROUNDS_STACK',
    screen: 'ROUNDS_LIST',
    roles: ['ADMIN', 'SHIFT'],
  },
  {
    label: 'Horarios',
    icon: 'calendar-clock',
    route: 'SCHEDULES_STACK',
    screen: 'SCHEDULES_LIST',
    roles: ['ADMIN'],
  },
  {
    label: 'Clientes',
    icon: 'office-building',
    route: 'CLIENTS_STACK',
    screen: 'CLIENTS_MAIN',
    roles: ['ADMIN'],
  },
  {
    label: 'Zonas',
    icon: 'layers-outline',
    route: 'ZONES_STACK',
    screen: 'ZONES_MAIN',
    roles: ['ADMIN'],
  },
  {
    label: 'Locaciones',
    icon: 'map-marker-outline',
    route: 'LOCATIONS_STACK',
    screen: 'LOCATIONS_MAIN',
    roles: ['ADMIN', 'SHIFT'],
  },
];

/* ======================================================
   COMPONENT
====================================================== */
const DrawerContent = ({ navigation }: { navigation: any }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { resetToModule } = useAppNavigation();

  const userState = useAppSelector((state: RootState) => state.userState);
  const userRole = userState.role;

  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [isCheckingRound, setIsCheckingRound] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('Inicio');

  const filteredMenuItems = MENU_ITEMS.filter(item =>
    item.roles.includes(userRole as any),
  );

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.log('Error al cerrar sesión en API', e);
    } finally {
      dispatch(logout());
    }
  };

  const onLogoutPress = async () => {
    if (userRole === 'GUARD') {
      setIsCheckingRound(true);
      try {
        const roundRes = await getCurrentRound();
        if (roundRes.success && roundRes.data) {
          setLogoutAlertVisible(true);
          setIsCheckingRound(false);
          return;
        }
      } catch (error) {
        // Assume no active round or error fetching, proceed to logout
      }
      setIsCheckingRound(false);
    }
    await handleLogout();
  };

  const handleNavigation = (item: MenuItem) => {
    setSelectedItem(item.label);
    const params =
      item.label === 'Contactos'
        ? { residentId: Number(userState.id) }
        : undefined;
    resetToModule(item.route as any, item.screen, params);
  };

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userState.fullName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text variant="titleMedium" style={styles.userName} numberOfLines={1}>
            {userState.fullName || 'Usuario'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.userRole}>
              {ROLE_LABELS[userState.role || ''] || userState.role}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('PROFILE_SCREEN')}
        >
          <Icon source="pencil" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ================= MENU ================= */}
      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredMenuItems.map((item, index) => {
          const isSelected = selectedItem === item.label;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, isSelected && styles.menuItemSelected]}
              onPress={() => handleNavigation(item)}
            >
              <View
                style={[styles.iconBox, isSelected && styles.iconBoxSelected]}
              >
                <Icon
                  source={item.icon}
                  size={20}
                  color={isSelected ? theme.colors.primary : '#64748B'}
                />
              </View>

              <Text
                style={[
                  styles.menuLabel,
                  isSelected && styles.menuLabelSelected,
                ]}
              >
                {item.label}
              </Text>

              {isSelected && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ================= FOOTER ================= */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogoutPress}
          disabled={isCheckingRound}
        >
          {isCheckingRound ? (
            <ActivityIndicator size={18} color="#EF4444" />
          ) : (
            <Icon source="logout" size={18} color="#EF4444" />
          )}
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Versión 1.0.22</Text>
      </View>

      <ITAlert
        visible={logoutAlertVisible}
        title="Ronda Activa"
        description="Tienes que finalizar tu ronda activa antes de cerrar sesión."
        type="warning"
        confirmLabel="Entendido"
        onConfirm={() => setLogoutAlertVisible(false)}
        onDismiss={() => setLogoutAlertVisible(false)}
      />
    </View>
  );
};

export default DrawerContent;

/* ======================================================
   STYLES MODERNOS
====================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  userRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  menuItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F8FAFC',
  },
  iconBoxSelected: {
    backgroundColor: '#E0E7FF',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    letterSpacing: -0.2,
  },
  menuLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    width: 3,
    height: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  footer: {
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 16,
    marginBottom: 8,
  },
});
