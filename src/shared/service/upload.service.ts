import { API_CONSTANTS } from '../../core/constants/API_CONSTANTS';
import { store } from '../../core/store/redux.config';
import { Image, Video } from 'react-native-compressor';
import { Platform } from 'react-native';

export const uploadFile = async (
  uri: string,
  type: 'video' | 'image',
  locationName: string = 'unknown',
  roundId?: string,
): Promise<{ success: boolean; url?: string; error?: string }> => {
  let uploadUri = uri;

  try {
    console.log(`[Upload] Iniciando compresión: ${type}`, { uri });
    if (type === 'image') {
      const compressedUri = await Image.compress(uri, {
        compressionMethod: 'manual',
        maxWidth: 1024,
        quality: 0.8,
      });
      if (compressedUri) uploadUri = compressedUri;
    } else if (type === 'video') {
      const compressedUri = await Video.compress(uri, {
        compressionMethod: 'auto',
      });
      if (compressedUri) uploadUri = compressedUri;
    }
  } catch (error) {
    console.warn('[Upload] Compresión fallida, usando original', error);
  }

  // Formateo de URI para Android
  if (
    Platform.OS === 'android' &&
    !uploadUri.startsWith('file://') &&
    !uploadUri.startsWith('http')
  ) {
    uploadUri = `file://${uploadUri}`;
  }

  const filename =
    uploadUri.split('/').pop() ||
    (type === 'video' ? 'video.mp4' : 'image.jpg');
  let mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
  if (filename.toLowerCase().endsWith('.mov')) mimeType = 'video/quicktime';
  if (filename.toLowerCase().endsWith('.3gp')) mimeType = 'video/3gpp';
  if (filename.toLowerCase().endsWith('.png')) mimeType = 'image/png';

  const formData = new FormData();
  formData.append('location', locationName);
  if (roundId) {
    formData.append('roundId', roundId);
  }
  formData.append('file', {
    uri: uploadUri,
    name: filename,
    type: mimeType,
  } as any);

  const state = store.getState();
  const token = state.userState.token;

  console.log('[Upload] Enviando a:', `${API_CONSTANTS.BASE_URL}/uploads`);

  let attempts = 0;
  const maxRetries = 2; // Total 3 intentos

  const performUpload = async (): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> => {
    try {
      const response = await fetch(`${API_CONSTANTS.BASE_URL}/uploads`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
      });

      const result = await response.json();
      if (response.ok && (result.success || result.url || result.data?.url)) {
        return { success: true, url: result.url || result.data?.url };
      }
      return {
        success: false,
        error: result.message || 'Error en respuesta del servidor',
      };
    } catch (error: any) {
      if (attempts < maxRetries) {
        attempts++;
        console.warn(
          `[Upload] Intento ${attempts} fallido, reintentando...`,
          error.message,
        );
        return performUpload();
      }
      console.warn('[Upload] Error de red persistente:', error.message);
      return { success: false, error: `Error de red: ${error.message}` };
    }
  };

  return performUpload();
};
