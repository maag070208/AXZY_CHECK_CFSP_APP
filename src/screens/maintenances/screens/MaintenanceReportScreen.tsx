import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Dimensions, StatusBar, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Chip, IconButton, Surface, TouchableRipple, Icon, Portal, Dialog } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../../shared/theme/theme';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';
import { CameraModal } from '../../check/components/CameraModal';
import { createMaintenance } from '../service/maintenance.service';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { uploadFile } from '../../../shared/service/upload.service';

const { width } = Dimensions.get('window');

const CATEGORIES = {
  'PLOMERIA': {  label: 'PLOMERÍA', color: '#0288d1', icon: 'water-pump', types: ['Fuga de agua', 'Falta de agua', 'Drenaje tapado', 'Humedad/Goteras'] },
  'ELECTRICIDAD': { label: 'ELECTRICIDAD', color: '#fbc02d', icon: 'lightning-bolt', types: ['Luminaria apagada', 'Corto circuito', 'Fallo en portón', 'Cámaras sin función'] },
  'ESTRUCTURA': { label: 'ESTRUCTURA', color: '#7b1fa2', icon: 'home-city', types: ['Daño en pintura', 'Cristal roto', 'Fallo en cerco', 'Baches/Pavimento'] },
  'JARDINERIA': { label: 'JARDINERÍA', color: '#388e3c', icon: 'pine-tree', types: ['Poda de césped', 'Poda de árboles', 'Riego faltante', 'Plagas'] },
  'GENERAL': { label: 'GENERAL', color: '#e65100', icon: 'toolbox', types: ['Daños en equipamiento', 'Limpieza profunda requerida', 'Otro'] }
};


export const MaintenanceReportScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const dispatch = useDispatch();
    
    const { initialCategory } = route.params || {};

    const [category, setCategory] = useState<string>(initialCategory || 'GENERAL');
    const [selectedType, setSelectedType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [media, setMedia] = useState<any[]>([]);
    
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

    useFocusEffect(
        useCallback(() => {
            return () => {
                setCategory('GENERAL');
                setSelectedType('');
                setDescription('');
                setMedia([]);
                setLoading(false);
            };
        }, [])
    );

    const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
        const tempId = Date.now().toString();
        const newItem = { id: tempId, uri: file.uri, type: file.type, uploading: true, error: false };
        setMedia(prev => [...prev, newItem]);

        try {
            const res = await uploadFile(file.uri, file.type === 'video' ? 'video' : 'image', 'maintenance');
            setMedia(prev => prev.map(item => {
                if (item.id === tempId) {
                    if (res.success && res.url) return { ...item, url: res.url, uploading: false };
                    else return { ...item, uploading: false, error: true };
                }
                return item;
            }));

            if (!res.success) dispatch(showToast({ message: 'Error al subir archivo', type: 'error' }));

        } catch (e) {
            setMedia(prev => prev.map(item => {
                if (item.id === tempId) return { ...item, uploading: false, error: true };
                return item;
            }));
        }
    };

    const handleSubmit = async () => {
        if (!selectedType) {
            Alert.alert('Falta información', 'Selecciona el tipo de problema primero.');
            return;
        }

        const pending = media.some(m => m.uploading);
        if (pending) {
            Alert.alert('Espera', 'Hay archivos subiéndose, por favor espera.');
            return;
        }

        const failed = media.some(m => m.error);
        if (failed) {
            Alert.alert('Error', 'Algunos archivos fallaron al subir. Elimínalos o intenta de nuevo.');
            return;
        }
        
        const validMedia = media.filter(m => m.url).map(m => ({ 
            type: m.type === 'video' ? 'VIDEO' : 'IMAGE', 
            url: m.url 
        }));

        setLoading(true);
        const res = await createMaintenance({
            title: selectedType,
            category: category,
            description: description,
            media: validMedia
        });
        setLoading(false);

        if (res.success) {
            dispatch(showToast({ message: 'Reporte de mantenimiento enviado', type: 'success' }));
            navigation.goBack();
        } else {
            Alert.alert('Error', 'No se pudo enviar el reporte.');
        }
    };

    const removeMedia = (index: number) => {
        const newMedia = [...media];
        newMedia.splice(index, 1);
        setMedia(newMedia);
    };

    const currentCat = CATEGORIES[category as keyof typeof CATEGORIES];
    const isUploading = media.some(m => m.uploading);

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Surface style={styles.header} elevation={1}>
                <IconButton icon="chevron-left" size={30} onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle}>Nuevo Mantenimiento</Text>
                <View style={{ width: 48 }} /> 
            </Surface>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                <Text style={styles.label}>1. CATEGORÍA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                     <View style={styles.categoryGrid}>
                        {Object.keys(CATEGORIES).map((catKey) => {
                            const item = CATEGORIES[catKey as keyof typeof CATEGORIES];
                            const isSelected = category === catKey;
                            return (
                                <Surface 
                                    key={catKey} 
                                    elevation={isSelected ? 4 : 0} 
                                    style={[styles.catCardWrapper, isSelected && { backgroundColor: item.color }]}
                                >
                                    <TouchableRipple
                                        onPress={() => { setCategory(catKey); setSelectedType(''); }}
                                        style={styles.catRipple}
                                    >
                                        <View style={styles.catCardContent}>
                                            <Icon source={item.icon} size={26} color={isSelected ? 'white' : '#757575'} />
                                            <Text style={[styles.catText, isSelected && { color: 'white' }]}>{item.label}</Text>
                                        </View>
                                    </TouchableRipple>
                                </Surface>
                            );
                        })}
                    </View>
                </ScrollView>

                <Text style={styles.label}>2. TIPO DE MANTENIMIENTO</Text>
                <View style={styles.typeWrapper}>
                    {currentCat.types.map((type) => (
                        <Chip
                            key={type}
                            selected={selectedType === type}
                            onPress={() => setSelectedType(type)}
                            style={[styles.typeChip, selectedType === type && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                            textStyle={[styles.typeChipText, selectedType === type && { color: theme.colors.primary }]}
                            showSelectedCheck={false}
                            mode="outlined"
                        >
                            {type}
                        </Chip>
                    ))}
                </View>

                <Text style={styles.label}>3. EVIDENCIA</Text>
                <View style={styles.photoActionRow}>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.bigCaptureBtn, { backgroundColor: '#FFFFFF', borderColor: theme.colors.primary, borderWidth: 2 }]}
                        onPress={() => { setCameraMode('photo'); setCameraVisible(true); }}
                    >
                        <Icon source="camera" size={32} color={theme.colors.primary} />
                        <Text style={[styles.bigCaptureText, { color: theme.colors.primary }]}>FOTO</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.bigCaptureBtn, { backgroundColor: '#455A64' }]}
                        onPress={() => { setCameraMode('video'); setCameraVisible(true); }}
                    >
                        <Icon source="video" size={32} color="white" />
                        <Text style={styles.bigCaptureText}>VIDEO</Text>
                    </TouchableOpacity>
                </View>

                {media.length > 0 && (
                    <ScrollView horizontal style={styles.mediaList} showsHorizontalScrollIndicator={false}>
                        {media.map((item, index) => (
                            <View key={index} style={styles.mediaItem}>
                                <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                                {item.type === 'video' && <View style={styles.videoIconOverlay}><Icon source="play-circle" color="white" size={30} /></View>}
                                {item.uploading && <View style={styles.loaderOverlay}><ActivityIndicator size="small" color="white" /></View>}
                                {item.error && <View style={styles.errorOverlay}><Icon source="alert-circle" color="red" size={24} /></View>}
                                <IconButton 
                                    icon="close-circle" 
                                    size={22} 
                                    containerColor="white" 
                                    iconColor="#E53935"
                                    style={styles.deleteMedia} 
                                    onPress={() => removeMedia(index)} 
                                />
                            </View>
                        ))}
                    </ScrollView>
                )}

                <Text style={styles.label}>4. OBSERVACIONES ADICIONALES</Text>
                <TextInput
                    mode="outlined"
                    multiline
                    placeholder="Describe lo sucedido brevemente..."
                    value={description}
                    onChangeText={setDescription}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor={theme.colors.primary}
                />

                    <Button 
                        mode="contained" 
                        onPress={handleSubmit} 
                        style={[styles.mainSubmitBtn, (!selectedType || isUploading) && { backgroundColor: '#BDBDBD' }]}
                        contentStyle={{ height: 60 }}
                        loading={loading}
                        disabled={loading || !selectedType || isUploading}
                    >
                        <Text style={styles.submitBtnText}>{isUploading ? 'SUBIENDO...' : 'ENVIAR REPORTE'}</Text>
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>

            <CameraModal
                visible={cameraVisible}
                mode={cameraMode}
                onDismiss={() => setCameraVisible(false)}
                onCapture={handleCapture}
                maxDuration={APP_SETTINGS.INCIDENT_VIDEO_DURATION_LIMIT}
            />
            
            <Portal>
                {isUploading && (
                    <View style={styles.uploadingOverlay}>
                        <Surface style={styles.uploadingCard} elevation={4}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.uploadingText}>Subiendo evidencia...</Text>
                        </Surface>
                    </View>
                )}
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, backgroundColor: 'white' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
    content: { padding: 16, paddingBottom: 60 },
    label: { fontSize: 11, fontWeight: '900', color: '#9E9E9E', marginBottom: 12, marginTop: 15, letterSpacing: 1.2 },
    
    categoryGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    catCardWrapper: { width: 100, height: 90, borderRadius: 16, backgroundColor: '#F5F5F5', overflow: 'hidden' },
    catRipple: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    catCardContent: { alignItems: 'center' },
    catText: { fontSize: 9, fontWeight: '800', marginTop: 8, textAlign: 'center', color: '#616161' },

    typeWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeChip: { borderRadius: 10, borderColor: '#EEEEEE' },
    typeChipText: { fontSize: 13, fontWeight: '600' },

    photoActionRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    bigCaptureBtn: { flex: 1, height: 90, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    bigCaptureText: { color: 'white', fontWeight: '900', fontSize: 13, marginTop: 6 },

    mediaList: { marginBottom: 20, paddingVertical: 5 },
    mediaItem: { marginRight: 15, position: 'relative' },
    mediaImg: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F5F5F5' },
    videoIconOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12 },
    deleteMedia: { position: 'absolute', top: -12, right: -12, margin: 0 },

    textInput: { backgroundColor: 'white', minHeight: 100, fontSize: 15 },
    mainSubmitBtn: { marginTop: 30, borderRadius: 12, elevation: 4 },
    submitBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    
    loaderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    errorOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.2)', borderRadius: 12 },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 },
    uploadingCard: { padding: 20, borderRadius: 16, alignItems: 'center', backgroundColor: 'white' },
    uploadingText: { marginTop: 10, fontWeight: 'bold', color: theme.colors.primary }
});
