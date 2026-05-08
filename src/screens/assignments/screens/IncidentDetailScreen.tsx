import { useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Avatar, IconButton, Icon } from 'react-native-paper';
import Video from 'react-native-video';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import {
  CATEGORIES_INFO as CATEGORIES,
  COLORS,
} from '../../../shared/utils/constants';
import { deleteIncident, resolveIncident } from '../service/incident.service';
import {
  ITScreenWrapper,
  ITCard,
  ITText,
  ITButton,
  ITAlert,
} from '../../../shared/components';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';

const { width } = Dimensions.get('window');

export const IncidentDetailScreen = () => {
  const { goBack } = useAppNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);

  const [incident, setIncident] = useState(route.params.incident);
  const [resolving, setResolving] = useState(false);
  const [fullMedia, setFullMedia] = useState<any>(null);
  const [showResolveAlert, setShowResolveAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const getCategoryInfo = (category: any) => {
    if (category && typeof category === 'object') {
      return {
        label: category.name || category.value || 'General',
        color: category.color || COLORS.textSecondary,
        icon: category.icon || 'alert',
      };
    }
    return (
      CATEGORIES[category as keyof typeof CATEGORIES] || {
        label: category || 'General',
        color: COLORS.textSecondary,
        icon: 'alert',
      }
    );
  };

  const onConfirmResolve = async () => {
    setShowResolveAlert(false);
    setResolving(true);
    const res = await resolveIncident(incident.id);
    setResolving(false);

    if (res.success && res.data) {
      setIncident(res.data);
      dispatch(
        showToast({
          message: 'Incidencia atendida correctamente',
          type: 'success',
        }),
      );
      // Regresar a la lista después de atender
      setTimeout(() => {
        goBack();
      }, 500);
    } else {
      dispatch(
        showToast({
          message: 'No se pudo actualizar el estado',
          type: 'error',
        }),
      );
    }
  };

  const onConfirmDelete = async () => {
    setShowDeleteAlert(false);
    setResolving(true);
    const res = await deleteIncident(incident.id);
    setResolving(false);

    if (res.success) {
      dispatch(
        showToast({
          message: 'Incidencia eliminada correctamente',
          type: 'success',
        }),
      );
      goBack();
    } else {
      dispatch(
        showToast({
          message: 'No se pudo eliminar la incidencia',
          type: 'error',
        }),
      );
    }
  };

  const getDateTime = (date: string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const categoryInfo = getCategoryInfo(incident.category);
  const dateTime = getDateTime(incident.createdAt);

  const isPending = incident.status === 'PENDING' || !incident.status;
  const canResolve =
    isPending && (user.role === UserRole.ADMIN || user.role === UserRole.SHIFT);

  const renderMediaItem = (media: any, index: number) => {
    const isVideo = media?.type?.toUpperCase() === 'VIDEO';
    return (
      <TouchableOpacity
        key={index}
        style={styles.mediaCard}
        onPress={() => setFullMedia(media)}
        activeOpacity={0.9}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: media.url }}
              style={styles.videoPreview}
              resizeMode="cover"
              paused={true}
            />
            <View style={styles.videoOverlay}>
              <IconButton icon="play-circle" size={44} iconColor="#FFFFFF" />
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: media.url }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        )}
        <View style={styles.mediaTypeBadge}>
          <Icon source={isVideo ? 'video' : 'camera'} size={12} color="#fff" />
          <ITText variant="labelSmall" style={{ color: '#fff', marginLeft: 4 }}>
            {isVideo ? 'VIDEO' : 'FOTO'}
          </ITText>
        </View>
      </TouchableOpacity>
    );
  };

  const FullScreenMedia = () => {
    if (!fullMedia) return null;
    const isVideo = fullMedia?.type?.toUpperCase() === 'VIDEO';

    return (
      <Modal visible={!!fullMedia} transparent={true} animationType="fade">
        <View style={styles.fullScreenContainer}>
          <IconButton
            icon="close"
            size={32}
            iconColor="#FFFFFF"
            style={styles.closeButton}
            onPress={() => setFullMedia(null)}
          />
          {isVideo ? (
            <Video
              source={{ uri: fullMedia.url }}
              style={styles.fullScreenVideo}
              resizeMode="contain"
              controls={true}
            />
          ) : (
            <Image
              source={{ uri: fullMedia.url }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.fullScreenFooter}>
            <ITText variant="bodyMedium" style={{ color: '#fff' }}>
              Evidencia de {categoryInfo.label}
            </ITText>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ITScreenWrapper padding={false} scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isPending
                  ? COLORS.red + '20'
                  : COLORS.emerald + '20',
              },
            ]}
          >
            <ITText
              variant="labelLarge"
              weight="bold"
              style={{ color: isPending ? COLORS.red : COLORS.emerald }}
            >
              {isPending ? 'PENDIENTE' : 'ATENDIDA'}
            </ITText>
          </View>
          <ITText variant="headlineMedium" weight="bold" style={styles.title}>
            {incident.title}
          </ITText>
          <View style={styles.metaRow}>
            <Icon source="calendar" size={16} color={COLORS.textSecondary} />
            <ITText
              variant="bodyMedium"
              color={COLORS.textSecondary}
              style={styles.metaText}
            >
              {dateTime.date} a las {dateTime.time}
            </ITText>
          </View>
        </View>

        <ITCard style={styles.sectionCard}>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.sectionTitle}
          >
            Ubicación y Cliente
          </ITText>
          <View style={styles.infoRow}>
            <Icon source="office-building" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <ITText variant="labelSmall" color={COLORS.textSecondary}>
                CLIENTE
              </ITText>
              <ITText variant="bodyLarge" weight="bold">
                {incident.client?.name || 'N/A'}
              </ITText>
            </View>
          </View>
        </ITCard>

        <ITCard style={styles.sectionCard}>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.sectionTitle}
          >
            Reportado por
          </ITText>
          <View style={styles.guardRow}>
            <Avatar.Text
              size={48}
              label={incident.guard?.name?.charAt(0) || 'G'}
              style={{ backgroundColor: COLORS.primary }}
            />
            <View style={styles.guardInfo}>
              <ITText variant="bodyLarge" weight="bold">
                {incident.guard?.name}
              </ITText>
              <ITText variant="labelSmall" color={COLORS.textSecondary}>
                GUARDIA DE SEGURIDAD
              </ITText>
            </View>
          </View>
        </ITCard>

        <ITCard style={styles.sectionCard}>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.sectionTitle}
          >
            Descripción
          </ITText>
          <ITText variant="bodyLarge" style={styles.description}>
            {incident.description || 'Sin descripción detallada.'}
          </ITText>
        </ITCard>

        {incident.media && incident.media.length > 0 && (
          <View style={styles.mediaSection}>
            <ITText
              variant="titleMedium"
              weight="bold"
              style={styles.mediaTitle}
            >
              Evidencia Multimedia
            </ITText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaList}
            >
              {incident.media.map((item: any, index: number) =>
                renderMediaItem(item, index),
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.actions}>
          {canResolve && (
            <ITButton
              mode="contained"
              onPress={() => setShowResolveAlert(true)}
              loading={resolving}
              style={styles.resolveButton}
              icon="check-circle"
              label="MARCAR COMO ATENDIDA"
            />
          )}
          {user.role === UserRole.ADMIN && (
            <ITButton
              mode="outlined"
              onPress={() => setShowDeleteAlert(true)}
              style={styles.deleteButton}
              icon="delete"
              textColor={COLORS.white}
              iconColor={COLORS.white}
              label="ELIMINAR REPORTE"
            />
          )}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      <ITAlert
        visible={showResolveAlert}
        title="Confirmar"
        description="¿Marcar esta incidencia como atendida?"
        confirmLabel="Sí, atender"
        onDismiss={() => setShowResolveAlert(false)}
        onConfirm={onConfirmResolve}
        loading={resolving}
      />

      <ITAlert
        visible={showDeleteAlert}
        title="Eliminar Incidencia"
        description="¿Estás seguro de que deseas eliminar permanentemente esta incidencia?"
        confirmLabel="Eliminar"
        type="danger"
        onDismiss={() => setShowDeleteAlert(false)}
        onConfirm={onConfirmDelete}
        loading={resolving}
      />

      <FullScreenMedia />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 24,
    backgroundColor: '#fff',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 16,
  },
  guardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardInfo: {
    marginLeft: 16,
  },
  description: {
    lineHeight: 24,
    color: '#334155',
  },
  mediaSection: {
    marginVertical: 16,
  },
  mediaTitle: {
    marginLeft: 24,
    marginBottom: 12,
    color: COLORS.textSecondary,
  },
  mediaList: {
    paddingLeft: 24,
    paddingRight: 16,
    gap: 12,
  },
  mediaCard: {
    width: width * 0.7,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actions: {
    padding: 24,
    gap: 12,
  },
  resolveButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  deleteButton: {
    borderRadius: 12,
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenFooter: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
