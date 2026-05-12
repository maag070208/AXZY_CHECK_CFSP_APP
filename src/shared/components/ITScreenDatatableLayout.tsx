import React, { useEffect, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  IconButton,
  Searchbar,
  useTheme,
} from 'react-native-paper';
import { ITScreenWrapper } from './ITScreenWrapper';
import { ITText } from './ITText';

import { SKELETON_CONFIG } from '../utils/skeleton.constants';
import { ITStaggeredSkeletonDatatable } from './ITSkeletonDatatableLayout';
import { ITSkeletonBadge, ITSkeletonSearch } from './ITSkeletonSearch';

interface ITScreenDatatableLayoutProps<T> {
  title: string;
  totalItems: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onFilterPress?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  skeleton?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children?: React.ReactNode;
  filterBadges?: React.ReactNode;
  fab?: React.ReactNode;
  showSearchBar?: boolean;
  searchBar?: React.ReactNode;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export const ITScreenDatatableLayout = <T extends any>({
  title,
  totalItems,
  loading,
  refreshing,
  onRefresh,
  onFilterPress,
  searchQuery,
  onSearchChange,
  data,
  renderItem,
  keyExtractor,
  skeleton,
  emptyComponent,
  children,
  filterBadges,
  fab,
  showSearchBar = true,
  searchBar,
  onLoadMore,
  loadingMore,
}: ITScreenDatatableLayoutProps<T>) => {
  const theme = useTheme() as any;
  const [showSkeleton, setShowSkeleton] = useState(loading || refreshing);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (loading || refreshing) {
      setShowSkeleton(true);
    } else {
      timeout = setTimeout(() => {
        setShowSkeleton(false);
        if (!loading && !refreshing) {
          setHasLoadedOnce(true);
        }
      }, SKELETON_CONFIG.SKELETON_VISIBLE_DURATION);
    }
    return () => clearTimeout(timeout);
  }, [loading, refreshing]);

  const renderSearchBar = () => {
    if (searchBar) return searchBar;

    return (
      <Searchbar
        placeholder="Buscar..."
        onChangeText={onSearchChange}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        placeholderTextColor="#94A3B8"
        iconColor="#64748B"
        elevation={0}
      />
    );
  };

  return (
    <ITScreenWrapper padding={false} scrollable={false} roundedTop>
      <View style={styles.container}>
        {/* HEADER MODERNIZADO */}
        <View
          style={[
            styles.header,
            filterBadges ? { height: 200 } : { height: 150 },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.titleSection}>
              {/* <ITText variant="headlineSmall" weight="700" style={styles.title}>
                {title}
              </ITText> */}
              <View style={styles.counterBadge}>
                <ITText variant="labelSmall" style={styles.counterText}>
                  {totalItems} registros
                </ITText>
              </View>
            </View>

            <View style={styles.headerActions}>
              {onFilterPress && (
                <IconButton
                  icon="filter-variant"
                  onPress={onFilterPress}
                  mode="contained"
                  containerColor="#F1F5F9"
                  iconColor="#64748B"
                  size={20}
                  style={styles.actionButton}
                />
              )}
              <IconButton
                icon="refresh"
                onPress={onRefresh}
                mode="contained"
                containerColor="#F1F5F9"
                iconColor="#64748B"
                size={20}
                style={styles.actionButton}
              />
            </View>
          </View>

          {showSearchBar && (
            <View style={styles.searchSection}>
              {showSkeleton && !hasLoadedOnce ? (
                <ITSkeletonSearch />
              ) : (
                renderSearchBar()
              )}
            </View>
          )}

          {filterBadges && (
            <View style={styles.badgesContainer}>
              {showSkeleton && !hasLoadedOnce ? (
                <ITSkeletonBadge />
              ) : (
                filterBadges
              )}
            </View>
          )}
        </View>

        {/* CONTENIDO DINÁMICO */}
        <View style={styles.contentContainer}>
          {showSkeleton ? (
            <FlatList
              data={Array(6).fill(0)}
              renderItem={({ index }) => (
                <View style={styles.skeletonItem}>
                  {skeleton || (
                    <ITStaggeredSkeletonDatatable items={1} key={index} />
                  )}
                </View>
              )}
              keyExtractor={(_, index) => `skeleton-${index}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
              ListHeaderComponent={children}
              ListFooterComponent={() =>
                loadingMore ? (
                  <View style={styles.footerSkeleton}>
                    {skeleton || <ITStaggeredSkeletonDatatable items={2} />}
                  </View>
                ) : null
              }
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={() =>
                emptyComponent || (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <ActivityIndicator size="large" color="#CBD5E1" />
                    </View>
                    <ITText style={styles.emptyTitle}>
                      No hay datos disponibles
                    </ITText>
                    <ITText style={styles.emptySubtitle}>
                      Los registros aparecerán aquí
                    </ITText>
                  </View>
                )
              }
            />
          )}
        </View>

        {fab && <View style={styles.fabContainer}>{fab}</View>}
      </View>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    height: 200,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  counterBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    margin: 0,
    borderRadius: 12,
  },
  searchSection: {
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    color: '#0F172A',
  },
  badgesContainer: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  skeletonItem: {
    marginBottom: 12,
  },
  footerSkeleton: {
    marginTop: 12,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
  },
});
