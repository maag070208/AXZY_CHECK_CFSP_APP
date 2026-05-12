import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import Video from 'react-native-video';
import { theme } from '../theme/theme';
import { ITText } from './ITText';
import { PreviewMedia } from './PreviewMedia';
import { getMediaCounts, IMedia } from '../utils/media.utils';

const { width } = Dimensions.get('window');

interface Props {
  media: any[];
  title?: string;
  horizontalWidth?: number;
}

export const ITMediaPreviewSection = ({
  media,
  title = 'EVIDENCIA MULTIMEDIA',
  horizontalWidth = width * 0.6,
}: Props) => {
  const [selectedMedia, setSelectedMedia] = useState<IMedia | null>(null);

  if (!media || media.length === 0) return null;

  const { photos, videos, normalized } = getMediaCounts(media);

  const renderMediaItem = (item: IMedia, index: number) => {
    if (!item) return null;
    const isVideo = item.type === 'VIDEO';

    return (
      <TouchableOpacity
        key={index}
        style={[styles.mediaCard, { width: horizontalWidth }]}
        onPress={() => setSelectedMedia(item)}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: item.url }}
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
            source={{ uri: item.url }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        )}
        <View style={styles.mediaTypeBadge}>
          <Icon source={isVideo ? 'video' : 'camera'} size={12} color="#fff" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ITText
          variant="labelSmall"
          weight="bold"
          color={theme.colors.slate400}
          style={styles.sectionLabel}
        >
          {title}
        </ITText>
        <View style={styles.mediaCounts}>
          {photos > 0 && (
            <View style={styles.countBadge}>
              <Icon source="camera" size={12} color={theme.colors.slate500} />
              <ITText
                variant="labelSmall"
                weight="800"
                color={theme.colors.slate600}
              >
                {photos}
              </ITText>
            </View>
          )}
          {videos > 0 && (
            <View style={[styles.countBadge, { marginLeft: 8 }]}>
              <Icon source="video" size={12} color={theme.colors.slate500} />
              <ITText
                variant="labelSmall"
                weight="800"
                color={theme.colors.slate600}
              >
                {videos}
              </ITText>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaList}
      >
        {normalized.map((item, index) => renderMediaItem(item!, index))}
      </ScrollView>

      {selectedMedia && (
        <PreviewMedia
          visible={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          url={selectedMedia.url}
          type={selectedMedia.type!}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  mediaCounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  mediaList: {
    paddingRight: 16,
    gap: 12,
  },
  mediaCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
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
    padding: 6,
    borderRadius: 8,
  },
});
