import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageStyle,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ActivityIndicator, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { useSelector } from 'react-redux';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import {
  ITBadge,
  ITButton,
  ITCard,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { PreviewMedia } from '../../../shared/components/PreviewMedia';
import { theme } from '../../../shared/theme/theme';
import { getRoundDetail, IRoundDetail } from '../service/rounds.service';

dayjs.locale('es');
const { width } = Dimensions.get('window');

interface TimelineNode {
  type: 'START' | 'POINT' | 'END';
  label: string;
  status:
    | 'START'
    | 'END'
    | 'SUCCESS'
    | 'DUPLICATE'
    | 'INCOMPLETE'
    | 'MISSING'
    | 'PENDING';
  timeDiff: string | null;
}

interface Metrics {
  duration: string;
  totalScans: number;
  totalRawScans: number;
  expectedScans: number;
  mapNodes: TimelineNode[];
  avgTime: string;
}

const formatTimeDiff = (mins: number, secs: number): string => {
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const RoundDetailScreen = ({ route }: any) => {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [data, setData] = useState<IRoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [sharing, setSharing] = useState(false);

  const token = useSelector((state: any) => state.userState.token);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getRoundDetail(id);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Error fetching round detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSharePDF = async () => {
    if (!data || sharing) return;
    setSharing(true);
    try {
      const url = `${API_CONSTANTS.BASE_URL}/rounds/${id}/report?token=${token}`;
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening PDF:', error);
    } finally {
      setSharing(false);
    }
  };

  const toggleEventExpanded = useCallback((index: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  }, []);

  const metrics = useMemo<Metrics | null>(() => {
    if (!data) return null;

    const start = new Date(data.round.startTime);
    const end = data.round.endTime
      ? new Date(data.round.endTime)
      : data.round.status === 'COMPLETED'
      ? new Date()
      : null;
    const effectiveEnd = end || new Date();

    const durationMs = effectiveEnd.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    const durationSeconds = Math.floor((durationMs % 60000) / 1000);

    const scans = data.timeline
      .filter(e => e.type === 'SCAN')
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    const visitedLocations = new Set<string>();
    let validScansCount = 0;
    const mapNodes: TimelineNode[] = [
      { type: 'START', label: 'Inicio', status: 'START', timeDiff: null },
    ];

    let previousTime = start;

    scans.forEach(scan => {
      const current = new Date(scan.timestamp);
      const diff = current.getTime() - previousTime.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      const locId = String(scan.data?.location?.id);
      const isDuplicate = visitedLocations.has(locId);
      visitedLocations.add(locId);

      const hasEvidence =
        scan.data?.media &&
        Array.isArray(scan.data.media) &&
        scan.data.media.length > 0;

      let status: TimelineNode['status'] = 'SUCCESS';
      if (isDuplicate) status = 'DUPLICATE';
      else if (!hasEvidence) status = 'INCOMPLETE';
      else validScansCount++;

      mapNodes.push({
        type: 'POINT',
        label: scan.data?.location?.name || 'Punto sin nombre',
        status,
        timeDiff: formatTimeDiff(mins, secs),
      });

      previousTime = current;
    });

    const expectedLocs =
      (data.round as any).recurringConfiguration?.recurringLocations?.map(
        (rl: any) => rl.location,
      ) ||
      data.round.client?.locations ||
      [];
    const missingLocs = expectedLocs.filter(
      (l: any) => !visitedLocations.has(String(l.id)),
    );

    missingLocs.forEach((loc: any) => {
      mapNodes.push({
        type: 'POINT',
        label: loc.name,
        status: data.round.status === 'COMPLETED' ? 'MISSING' : 'PENDING',
        timeDiff: '--',
      });
    });

    if (data.round.endTime) {
      const current = new Date(data.round.endTime);
      const diff = current.getTime() - previousTime.getTime();
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      mapNodes.push({
        type: 'END',
        label: 'Fin',
        status: 'END',
        timeDiff: formatTimeDiff(mins, secs),
      });
    }

    const avgTime =
      scans.length > 0
        ? durationMs / (scans.length + (data.round.endTime ? 1 : 0))
        : 0;
    const avgMins = Math.floor(avgTime / 60000);
    const avgSecs = Math.floor((avgTime % 60000) / 1000);

    return {
      duration: formatTimeDiff(durationMinutes, durationSeconds),
      totalScans: validScansCount,
      totalRawScans: scans.length,
      expectedScans: expectedLocs.length,
      mapNodes,
      avgTime: formatTimeDiff(avgMins, avgSecs),
    };
  }, [data]);

  const handleOpenMap = useCallback(() => {
    if (!data) return;

    const scansWithCoords = data.timeline
      .filter(e => e.type === 'SCAN' && e.data?.latitude && e.data?.longitude)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    if (scansWithCoords.length === 0) return;

    if (scansWithCoords.length === 1) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${scansWithCoords[0].data.latitude},${scansWithCoords[0].data.longitude}`,
      );
      return;
    }

    const origin = `${scansWithCoords[0].data.latitude},${scansWithCoords[0].data.longitude}`;
    const destination = `${
      scansWithCoords[scansWithCoords.length - 1].data.latitude
    },${scansWithCoords[scansWithCoords.length - 1].data.longitude}`;
    const waypoints = scansWithCoords
      .slice(1, -1)
      .map(s => `${s.data.latitude},${s.data.longitude}`)
      .join('|');

    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=walking`,
    );
  }, [data]);

  const renderNotes = useCallback((notes: string) => {
    if (!notes) return null;

    if (notes.includes('--- LISTA DE VERIFICACIÓN ---')) {
      const parts = notes.split('--- LISTA DE VERIFICACIÓN ---');
      const headerText = parts[0].trim();
      const checklistText = parts[1].trim();
      const lines = checklistText.split('\n').filter(l => l.trim() !== '');

      return (
        <View style={styles.checklistContainer}>
          {headerText ? (
            <View style={styles.webNotesBox}>
              <ITText variant="bodySmall" color="#475569">
                {headerText}
              </ITText>
            </View>
          ) : null}

          <View style={styles.checklistCard}>
            <View style={styles.checklistHeader}>
              <Icon
                source="clipboard-check-outline"
                size={18}
                color={theme.colors.primary}
              />
              <ITText
                variant="labelSmall"
                weight="bold"
                color={theme.colors.primary}
                style={styles.checklistTitle}
              >
                LISTA DE VERIFICACIÓN
              </ITText>
            </View>
            {lines.map((line, idx) => {
              const isCompleted = line.includes('[x]');
              const text = line.replace('[x]', '').replace('[ ]', '').trim();
              return (
                <View key={idx} style={styles.checklistItem}>
                  <Icon
                    source={
                      isCompleted ? 'checkbox-marked' : 'checkbox-blank-outline'
                    }
                    size={20}
                    color={isCompleted ? '#10B981' : '#CBD5E1'}
                  />
                  <ITText
                    variant="bodyMedium"
                    style={[
                      styles.checklistText,
                      isCompleted && styles.checklistTextCompleted,
                    ]}
                  >
                    {text}
                  </ITText>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.webNotesBox}>
        <ITText variant="bodySmall" color="#475569">
          {notes}
        </ITText>
      </View>
    );
  }, []);

  const renderMedia = useCallback((mediaArray: any[]) => {
    if (!mediaArray?.length) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mediaGallery}
        contentContainerStyle={styles.mediaGalleryContent}
      >
        {mediaArray.map((m: any, idx: number) => {
          if (!m) return null;

          const rawUrl = typeof m === 'string' ? m : m.url;
          if (!rawUrl) return null;

          const isVid =
            typeof m === 'string'
              ? rawUrl.toLowerCase().match(/\.(mp4|mov|avi|quicktime)$/) !==
                null
              : m.type === 'VIDEO';

          const url = rawUrl.startsWith('http')
            ? rawUrl
            : API_CONSTANTS.BASE_URL.replace('/api/v1', '') + rawUrl;

          return (
            <ITTouchableOpacity
              key={idx}
              style={styles.mediaItem}
              onPress={() => {
                setPreviewUrl(url);
                setPreviewType(isVid ? 'VIDEO' : 'IMAGE');
                setPreviewVisible(true);
              }}
            >
              {isVid ? (
                <Video
                  source={{ uri: url }}
                  style={styles.mediaImage}
                  paused={true}
                  resizeMode="cover"
                  controls={false}
                  muted={true}
                />
              ) : (
                <Image
                  source={{ uri: url }}
                  style={styles.mediaImage as ImageStyle}
                />
              )}
              {isVid && (
                <View style={styles.videoBadge}>
                  <Icon source="play" size={16} color="#FFFFFF" />
                </View>
              )}
            </ITTouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, []);

  const renderTasks = useCallback((tasks: any[]) => {
    if (!tasks?.length) return null;

    return (
      <View style={styles.tasksContainer}>
        <ITText
          variant="labelSmall"
          weight="bold"
          color="#94A3B8"
          style={styles.tasksTitle}
        >
          TAREAS ASOCIADAS
        </ITText>
        {tasks.map((task, idx) => (
          <View key={idx} style={styles.taskItem}>
            <Icon
              source={task.completed ? 'check-circle' : 'circle-outline'}
              size={18}
              color={task.completed ? '#10B981' : '#CBD5E1'}
            />
            <ITText
              variant="bodySmall"
              style={[
                styles.taskText,
                task.completed && styles.taskTextCompleted,
              ]}
            >
              {task.description}
            </ITText>
          </View>
        ))}
      </View>
    );
  }, []);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { color: string; bgColor: string; icon: string; label: string }
    > = {
      START: {
        color: theme.colors.primary,
        bgColor: '#EEF2FF',
        icon: 'play',
        label: 'Inicio',
      },
      END: {
        color: '#0F172A',
        bgColor: '#F1F5F9',
        icon: 'flag-checkered',
        label: 'Fin',
      },
      SUCCESS: {
        color: '#10B981',
        bgColor: '#ECFDF5',
        icon: 'check',
        label: 'Completado',
      },
      DUPLICATE: {
        color: '#F43F5E',
        bgColor: '#FFF1F2',
        icon: 'alert',
        label: 'Repetido',
      },
      INCOMPLETE: {
        color: '#F59E0B',
        bgColor: '#FFFBEB',
        icon: 'alert',
        label: 'Incompleto',
      },
      MISSING: {
        color: '#F43F5E',
        bgColor: '#FFF1F2',
        icon: 'map-marker-question',
        label: 'Faltante',
      },
      PENDING: {
        color: '#94A3B8',
        bgColor: '#F8FAFC',
        icon: 'clock-outline',
        label: 'Pendiente',
      },
    };
    return configs[status] || configs.INCOMPLETE;
  };

  const getEventConfig = (type: string) => {
    const configs: Record<
      string,
      { icon: string; color: string; bgColor: string }
    > = {
      START: { icon: 'play', color: theme.colors.primary, bgColor: '#EEF2FF' },
      SCAN: {
        icon: 'qrcode-scan',
        color: theme.colors.primary,
        bgColor: '#F5F3FF',
      },
      INCIDENT: { icon: 'alert-octagon', color: '#F43F5E', bgColor: '#FFF1F2' },
      END: { icon: 'flag-checkered', color: '#10B981', bgColor: '#ECFDF5' },
    };
    return (
      configs[type] || {
        icon: 'circle-small',
        color: '#64748B',
        bgColor: '#F1F5F9',
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <ITText variant="bodySmall" color="#64748B" style={{ marginTop: 12 }}>
          Cargando detalles de la ronda...
        </ITText>
      </View>
    );
  }

  if (!data) return null;

  const routeTitle = data.round.client?.name || 'Ronda General';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Modern Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerInfo}>
              <ITText variant="headlineSmall" weight="bold" color="#0F172A">
                {routeTitle}
              </ITText>
              <ITText variant="bodySmall" color="#64748B" weight="medium">
                Iniciado el{' '}
                {dayjs(data.round.startTime).format('DD [de] MMMM, YYYY')}
              </ITText>
            </View>
            <ITButton
              label="Reporte"
              mode="tonal"
              icon="file-pdf-box"
              onPress={handleSharePDF}
              loading={sharing}
              disabled={sharing}
              style={styles.pdfBtn}
            />
          </View>

          <View style={styles.headerMetaRow}>
            <View style={styles.metaCard}>
              <View style={[styles.metaIcon, { backgroundColor: '#EEF2FF' }]}>
                <Icon source="account" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <ITText variant="labelSmall" weight="bold" color="#94A3B8">
                  GUARDIA
                </ITText>
                <ITText variant="titleSmall" weight="bold" color="#334155">
                  {data.round.guard.name} {data.round.guard.lastName}
                </ITText>
              </View>
            </View>
            <View style={styles.metaCard}>
              <View
                style={[
                  styles.metaIcon,
                  {
                    backgroundColor:
                      data.round.status === 'COMPLETED' ? '#ECFDF5' : '#FFFBEB',
                  },
                ]}
              >
                <Icon
                  source={
                    data.round.status === 'COMPLETED'
                      ? 'check-decagram'
                      : 'timer-outline'
                  }
                  size={20}
                  color={
                    data.round.status === 'COMPLETED' ? '#10B981' : '#D97706'
                  }
                />
              </View>
              <View>
                <ITText variant="labelSmall" weight="bold" color="#94A3B8">
                  ESTADO
                </ITText>
                <ITText
                  variant="titleSmall"
                  weight="bold"
                  color={
                    data.round.status === 'COMPLETED' ? '#10B981' : '#D97706'
                  }
                >
                  {data.round.status === 'COMPLETED'
                    ? 'FINALIZADA'
                    : 'EN CURSO'}
                </ITText>
              </View>
            </View>
          </View>
        </View>

        {/* Metrics Grid */}
        {metrics && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: '#F0F9FF' }]}>
                <Icon source="clock-fast" size={20} color="#0EA5E9" />
              </View>
              <ITText variant="labelSmall" weight="bold" color="#94A3B8">
                DURACIÓN
              </ITText>
              <ITText variant="titleMedium" weight="bold" color="#1E293B">
                {metrics.duration}
              </ITText>
            </View>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: '#F5F3FF' }]}>
                <Icon
                  source="qrcode-scan"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <ITText variant="labelSmall" weight="bold" color="#94A3B8">
                PUNTOS
              </ITText>
              <ITText variant="titleMedium" weight="bold" color="#1E293B">
                {metrics.totalScans}{' '}
                <ITText variant="bodySmall" color="#94A3B8">
                  / {metrics.expectedScans || metrics.totalRawScans}
                </ITText>
              </ITText>
            </View>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: '#FEFCE8' }]}>
                <Icon source="lightning-bolt" size={20} color="#EAB308" />
              </View>
              <ITText variant="labelSmall" weight="bold" color="#94A3B8">
                PROMEDIO
              </ITText>
              <ITText variant="titleMedium" weight="bold" color="#1E293B">
                {metrics.avgTime}
              </ITText>
            </View>
          </View>
        )}

        {/* Route Visualization */}
        {metrics && metrics.mapNodes.length > 0 && (
          <ITCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitle}>
                <View style={styles.indicator} />
                <ITText variant="titleMedium" weight="bold" color="#0F172A">
                  Ruta Recorrida
                </ITText>
              </View>
              <ITTouchableOpacity
                onPress={handleOpenMap}
                style={styles.mapAction}
              >
                <Icon
                  source="map-legend"
                  size={16}
                  color={theme.colors.primary}
                />
                <ITText
                  variant="labelSmall"
                  weight="bold"
                  color={theme.colors.primary}
                >
                  VER TRAZO
                </ITText>
              </ITTouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routeRow}
            >
              {metrics.mapNodes.map((node, idx) => {
                const config = getStatusConfig(node.status);
                return (
                  <View key={idx} style={styles.routeNodeContainer}>
                    {idx > 0 && (
                      <View style={styles.connector}>
                        <ITText
                          variant="labelSmall"
                          color="#94A3B8"
                          style={styles.connectorTime}
                        >
                          {node.timeDiff}
                        </ITText>
                        <View style={styles.connectorLine} />
                      </View>
                    )}
                    <View style={styles.routeNode}>
                      <View
                        style={[
                          styles.nodeCircle,
                          { borderColor: config.color },
                        ]}
                      >
                        <Icon
                          source={config.icon}
                          size={18}
                          color={config.color}
                        />
                      </View>
                      <ITText
                        variant="labelSmall"
                        weight="bold"
                        color="#64748B"
                        textAlign="center"
                        numberOfLines={2}
                      >
                        {node.label}
                      </ITText>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </ITCard>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitle}>
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <ITText variant="titleMedium" weight="bold" color="#0F172A">
                Línea de Tiempo
              </ITText>
            </View>
            <ITBadge
              label={`${data.timeline.length} eventos`}
              variant="surface"
              size="small"
            />
          </View>

          {data.timeline.map((event, idx) => {
            const isExpanded = expandedEvents.has(idx);
            const config = getEventConfig(event.type);
            const hasDetails =
              event.type === 'SCAN' || event.type === 'INCIDENT';

            return (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineSidebar}>
                  <View
                    style={[
                      styles.timelinePoint,
                      { backgroundColor: config.color },
                    ]}
                  >
                    <Icon source={config.icon} size={14} color="#fff" />
                  </View>
                  {idx < data.timeline.length - 1 && (
                    <View style={styles.timelineLink} />
                  )}
                </View>

                <ITTouchableOpacity
                  style={[
                    styles.eventCard,
                    isExpanded && styles.eventCardExpanded,
                  ]}
                  onPress={() => hasDetails && toggleEventExpanded(idx)}
                  disabled={!hasDetails}
                >
                  <View style={styles.eventHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.eventMeta}>
                        <ITText
                          variant="labelSmall"
                          weight="bold"
                          color="#94A3B8"
                        >
                          {dayjs(event.timestamp).format('HH:mm')}
                        </ITText>
                        <View
                          style={[
                            styles.eventBadge,
                            { backgroundColor: config.bgColor },
                          ]}
                        >
                          <ITText
                            variant="labelSmall"
                            weight="black"
                            color={config.color}
                          >
                            {event.type}
                          </ITText>
                        </View>
                      </View>
                      <ITText
                        variant="titleSmall"
                        weight="bold"
                        color="#334155"
                        style={{ marginTop: 4 }}
                      >
                        {event.description}
                      </ITText>
                    </View>
                    {hasDetails && (
                      <Icon
                        source={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#CBD5E1"
                      />
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.eventDetails}>
                      {event.type === 'SCAN' && event.data?.location && (
                        <View style={styles.detailBox}>
                          {event.data.latitude && event.data.longitude && (
                            <View style={styles.miniMap}>
                              <MapView
                                style={{ flex: 1 }}
                                initialRegion={{
                                  latitude: Number(event.data.latitude),
                                  longitude: Number(event.data.longitude),
                                  latitudeDelta: 0.002,
                                  longitudeDelta: 0.002,
                                }}
                                scrollEnabled={false}
                                zoomEnabled={false}
                              >
                                <Marker
                                  coordinate={{
                                    latitude: Number(event.data.latitude),
                                    longitude: Number(event.data.longitude),
                                  }}
                                  pinColor={config.color}
                                />
                              </MapView>
                            </View>
                          )}
                          <View style={styles.locationBanner}>
                            <Icon
                              source="office-building"
                              size={16}
                              color={theme.colors.primary}
                            />
                            <ITText
                              variant="bodySmall"
                              weight="bold"
                              color="#1E293B"
                            >
                              {event.data.location.name}
                            </ITText>
                          </View>
                          {renderNotes(event.data.notes)}
                          {renderTasks(event.data.assignment?.tasks)}
                          {renderMedia(event.data.media)}
                        </View>
                      )}

                      {event.type === 'INCIDENT' && (
                        <View style={styles.detailBox}>
                          <View style={styles.incidentHeader}>
                            <Icon
                              source="alert-octagon"
                              size={20}
                              color="#F43F5E"
                            />
                            <ITText
                              variant="bodyMedium"
                              weight="bold"
                              color="#F43F5E"
                            >
                              {event.data?.category}
                            </ITText>
                          </View>
                          {event.data?.description && (
                            <ITText
                              variant="bodySmall"
                              color="#475569"
                              style={styles.incidentDesc}
                            >
                              {event.data.description}
                            </ITText>
                          )}
                          {renderNotes(event.data.notes)}
                          {renderMedia(event.data?.media)}
                        </View>
                      )}
                    </View>
                  )}
                </ITTouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PreviewMedia
        visible={previewVisible}
        url={previewUrl}
        type={previewType}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerInfo: { flex: 1, marginRight: 16 },
  pdfBtn: { borderRadius: 12 },
  headerMetaRow: { flexDirection: 'row', gap: 16 },
  metaCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  indicator: {
    width: 4,
    height: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  mapAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  routeRow: { paddingVertical: 10 },
  routeNodeContainer: { flexDirection: 'row', alignItems: 'center' },
  connector: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  connectorTime: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    zIndex: 2,
    position: 'absolute',
    top: -5,
  },
  connectorLine: { width: '100%', height: 2, backgroundColor: '#E2E8F0' },
  routeNode: { width: 80, alignItems: 'center' },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineSection: { paddingHorizontal: 16, marginTop: 24 },
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineSidebar: { width: 30, alignItems: 'center' },
  timelinePoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLink: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: -2,
    marginBottom: -12,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    marginLeft: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  eventCardExpanded: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  eventDetails: { marginTop: 16, gap: 12 },
  detailBox: { gap: 12 },
  miniMap: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  checklistContainer: { gap: 12 },
  checklistCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checklistTitle: { letterSpacing: 1 },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checklistText: { flex: 1 },
  checklistTextCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  webNotesBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B33',
  },
  tasksContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  tasksTitle: { letterSpacing: 0.5 },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskText: { flex: 1 },
  taskTextCompleted: { color: '#94A3B8', textDecorationLine: 'line-through' },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: 10,
  },
  incidentDesc: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  mediaGallery: { marginTop: 8 },
  mediaGalleryContent: { gap: 8 },
  mediaItem: {
    width: 120,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  mediaImage: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 6,
  },
});

export default RoundDetailScreen;
