import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Chip,
  FAB,
  Portal,
  Searchbar,
  Dialog,
  Button,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITScreenWrapper,
  ITText,
  ITInput,
  ITButton,
  ITAlert,
} from '../../../shared/components';
import { LoaderComponent } from '../../../shared/components/LoaderComponent';
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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
            dispatch(showLoader(true));
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
        dispatch(showLoader(false));
      }
    },
    [debouncedSearch, selectedRole, dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      fetchUsers(1);
    }, [fetchUsers]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCatalogs(), fetchUsers(1, true)]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(page + 1);
    }
  };

  const handleEdit = (user: IUser) => {
    navigation.navigate('USER_FORM', { user });
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

  const renderItem = ({ item }: { item: IUser }) => (
    <UserListItem
      item={item}
      onPress={handleEdit}
      onDelete={handleDeletePress}
      onResetPassword={handleResetPress}
    />
  );

  return (
    <ITScreenWrapper
      padding={false}
      scrollable={false}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <ITText variant="headlineSmall" weight="bold">
            Directorio
          </ITText>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <ITText
              variant="labelSmall"
              weight="bold"
              color={theme.colors.outline}
            >
              {total}
            </ITText>
          </View>
        </View>

        <Searchbar
          placeholder="Buscar por nombre..."
          onChangeText={setSearch}
          value={search}
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          elevation={0}
          mode="bar"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {roleOptions.map(role => (
            <Chip
              key={role.label}
              selected={selectedRole === role.value}
              onPress={() => setSelectedRole(role.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedRole === role.value
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                },
              ]}
              textStyle={[
                styles.chipText,
                {
                  color:
                    selectedRole === role.value
                      ? theme.colors.onPrimary
                      : theme.colors.outline,
                },
              ]}
              showSelectedCheck={false}
            >
              {role.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator
                style={{ margin: 16 }}
                color={theme.colors.primary}
              />
            ) : null
          }
        />
      </View>

      {/* RESET PASSWORD DIALOG */}
      <Portal>
        <Dialog
          visible={showResetModal}
          onDismiss={() => !reseting && setShowResetModal(false)}
          style={{ borderRadius: 28, backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>
            <ITText variant="headlineSmall" weight="bold">
              Cambiar Contraseña
            </ITText>
          </Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <ITText variant="bodyMedium" color={theme.colors.onSurfaceVariant}>
              Ingresa la nueva contraseña para {selectedUser?.name}.
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
              mode="text"
              onPress={() => setShowResetModal(false)}
              disabled={reseting}
              style={{ flex: 1 }}
            />
            <ITButton
              label="Actualizar"
              onPress={handleResetPassword}
              loading={reseting}
              disabled={reseting || newPassword.length < 6}
              style={{ flex: 2 }}
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
        type="danger"
        loading={deleting}
      />

      {isFocused && (
        <Portal>
          <FAB
            icon="plus"
            style={[
              styles.fab,
              {
                bottom: insets.bottom + 24,
                backgroundColor: theme.colors.primary,
              },
            ]}
            color={theme.colors.onPrimary}
            onPress={() => navigation.navigate('USER_FORM')}
          />
        </Portal>
      )}
      <LoaderComponent />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  searchBar: {
    borderRadius: 24,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    alignSelf: 'center',
  },
  filtersRow: {
    paddingVertical: 4,
    gap: 10,
  },
  filterChip: {
    borderWidth: 0,
    borderRadius: 12,
    height: 32,
  },
  chipText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    minHeight: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    borderRadius: 28,
  },
});
