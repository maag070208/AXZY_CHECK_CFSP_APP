import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Dialog, FAB, Portal, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITAlert,
  ITBadge,
  ITButton,
  ITInput,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { getCatalog } from '../../../shared/service/catalog.service';
import { theme } from '../../../shared/theme/theme';
import {
  deleteUser,
  getPaginatedUsers,
  resetPassword,
} from '../../users/service/user.service';
import { IRoleOption, IUser } from '../../users/service/user.types';
import { UserListItem } from '../components/UserListItem';

export const UserListScreen = () => {
  const { navigateToScreen } = useAppNavigation();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();

  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [roleOptions, setRoleOptions] = useState<IRoleOption[]>([]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // RESET PASSWORD STATE
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reseting, setReseting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCatalogs = useCallback(async () => {
    try {
      const res = await getCatalog('role');
      if (res.success && res.data) {
        const mapped: IRoleOption[] = [
          { label: 'Todos', value: null },
          ...res.data.map((r: any) => ({
            label: r.value,
            value: r.name,
          })),
        ];
        setRoleOptions(mapped);
      }
    } catch (error) {
      console.error('Error loading catalogs:', error);
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const fetchUsers = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefreshing) {
            setLoading(true);
          }
        } else {
          setLoadingMore(true);
        }

        const params = {
          page: pageNum,
          limit: 15,
          filters: {
            name: debouncedSearch,
            role: selectedRole,
          },
        };

        const res = await getPaginatedUsers(params);

        if (res.success && res.data) {
          const newRows = (res.data.rows as IUser[]) || [];
          const totalRows = res.data.total || 0;

          setUsers(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, selectedRole],
  );

  useFocusEffect(
    useCallback(() => {
      fetchUsers(1);
    }, [fetchUsers]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCatalogs(), fetchUsers(1, true)]);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(page + 1);
    }
  };

  const handleEdit = (user: IUser) => {
    navigateToScreen('USERS_STACK', 'USER_FORM', { user });
  };

  const handleDeletePress = (id: string) => {
    setUserToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleResetPress = (user: IUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setShowResetModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const res = await deleteUser(userToDelete);
      if (res.success) {
        dispatch(showToast({ type: 'success', message: 'Usuario eliminado' }));
        fetchUsers(1, true);
      } else {
        dispatch(showToast({ type: 'error', message: 'Error al eliminar' }));
      }
    } catch (error) {
      dispatch(showToast({ type: 'error', message: 'Ocurrió un error' }));
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) {
      dispatch(showToast({ type: 'error', message: 'Mínimo 6 caracteres' }));
      return;
    }

    setReseting(true);
    try {
      const res = await resetPassword(selectedUser.id, newPassword);
      if (res.success) {
        dispatch(
          showToast({ type: 'success', message: 'Contraseña actualizada' }),
        );
        setShowResetModal(false);
      } else {
        dispatch(showToast({ type: 'error', message: 'Error al actualizar' }));
      }
    } catch (error) {
      dispatch(showToast({ type: 'error', message: 'Ocurrió un error' }));
    } finally {
      setReseting(false);
    }
  };

  const renderUser = ({ item }: { item: IUser }) => (
    <UserListItem
      item={item}
      onPress={handleEdit}
      onDelete={handleDeletePress}
      onResetPassword={handleResetPress}
    />
  );

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Directorio Personal"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        showSearchBar={true}
        searchBar={
          <Searchbar
            placeholder="Buscar personal..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        }
        filterBadges={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {roleOptions.map(role => (
              <ITTouchableOpacity
                key={role.label}
                onPress={() => setSelectedRole(role.value)}
              >
                <ITBadge
                  label={role.label}
                  variant={selectedRole === role.value ? 'primary' : 'surface'}
                  outline={selectedRole !== role.value}
                />
              </ITTouchableOpacity>
            ))}
          </ScrollView>
        }
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        fab={
          isFocused ? (
            <FAB
              icon="plus"
              style={styles.fab}
              color="#FFFFFF"
              onPress={() => navigateToScreen('USERS_STACK', 'USER_FORM')}
            />
          ) : undefined
        }
      />

      {/* RESET PASSWORD DIALOG */}
      <Portal>
        <Dialog
          visible={showResetModal}
          onDismiss={() => !reseting && setShowResetModal(false)}
          style={{ borderRadius: 28, backgroundColor: '#FFFFFF' }}
        >
          <Dialog.Title>
            <ITText variant="headlineSmall" weight="bold">
              Seguridad
            </ITText>
          </Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <ITText variant="bodyMedium" color={theme.colors.slate500}>
              Establecer nueva contraseña para {selectedUser?.name}.
            </ITText>
            <View style={{ marginTop: 16 }}>
              <ITInput
                label="Nueva Contraseña"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                leftIcon="lock-outline"
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                placeholder="Mínimo 6 caracteres"
                autoCapitalize="none"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions
            style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 12 }}
          >
            <ITButton
              label="Cancelar"
              mode="outlined"
              onPress={() => setShowResetModal(false)}
              disabled={reseting}
              style={{ flex: 1 }}
              textColor={theme.colors.slate500}
            />
            <ITButton
              label="Actualizar"
              onPress={handleResetPassword}
              loading={reseting}
              disabled={reseting || newPassword.length < 6}
              style={{ flex: 2, backgroundColor: theme.colors.primary }}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ITAlert
        visible={showDeleteDialog}
        onDismiss={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        description="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        type="alert"
        loading={deleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
    color: '#0F172A',
  },
  filtersRow: {
    paddingVertical: 4,
    gap: 10,
    paddingRight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
