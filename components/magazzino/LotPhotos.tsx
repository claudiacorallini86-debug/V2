import React, { useState, useRef, useCallback } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  Button,
  Card,
  Image,
  Separator,
  Theme,
  Spinner,
  Circle,
  useBlinkToast,
} from '@blinkdotnew/mobile-ui';
import { useLotPhotos } from '@/hooks/useIngredients';
import { Camera, Upload, Trash2, X, Maximize2, AlertCircle, RefreshCcw, ChevronLeft, ChevronRight } from '@blinkdotnew/mobile-ui';
import { StyleSheet, Platform, View, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { blink } from '@/lib/blink';

interface Props {
  lotId: string;
}

export function LotPhotos({ lotId }: Props) {
  const { photos, addPhoto, deletePhoto, updatePhotoOrder, isLoading } = useLotPhotos(lotId);
  const toastContext = useBlinkToast();
  
  // Safe toast helper
  const showToast = (title: string, options: any) => {
    const toastFn = typeof toastContext === 'function' ? toastContext : (toastContext as any)?.toast;
    if (typeof toastFn === 'function') {
      toastFn(title, options);
    } else {
      console.warn('Toast function not found', toastContext);
      if (Platform.OS === 'web') {
        alert(`${title}: ${options.message}`);
      }
    }
  };
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const videoRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<any>(null);

  const startCamera = async () => {
    if (photos.length >= 5) {
      showToast('Limite raggiunto', { message: 'Massimo 5 foto per lotto.', variant: 'warning' });
      return;
    }

    setIsCameraActive(true);
    setCameraError(null);

    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError(
          'Accesso alla fotocamera negato. Per abilitarlo vai in: Impostazioni > Privacy > Fotocamera e abilita il permesso per questo sito. Poi ricarica la pagina.'
        );
      }
    } else {
      setCameraError('La fotocamera via browser è disponibile solo su Web in questa versione.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web' || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        // Pass blob directly, SDK handles it
        await handleUpload(blob as any);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileSelect = (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Errore', { message: 'File troppo grande (max 10MB).', variant: 'error' });
        return;
      }
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File | Blob) => {
    if (photos.length >= 5) {
      showToast('Limite raggiunto', { message: 'Massimo 5 foto per lotto.', variant: 'warning' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const extension = (file as File).name ? (file as File).name.split('.').pop() : 'jpg';
      const path = `lots/${lotId}/photo_${Date.now()}.${extension}`;
      
      console.log('Uploading photo to path:', path);
      const res = await blink.storage.upload(file, path, {
        onProgress: (p) => setUploadProgress(p),
      });
      
      console.log('Upload result:', res);
      const photoUrl = res.url || res.publicUrl;

      if (!photoUrl) {
        throw new Error('Impossibile ottenere l\'URL della foto caricata.');
      }

      await addPhoto.mutateAsync({
        lotId,
        url: photoUrl,
        sortOrder: photos.length,
      });

      showToast('Caricato', { message: 'Foto caricata con successo.', variant: 'success' });
    } catch (err: any) {
      console.error('Upload error details:', err);
      showToast('Errore', { message: err.message || 'Errore durante il caricamento. Riprova.', variant: 'error' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = (id: string) => {
    const performDelete = async () => {
      try {
        await deletePhoto.mutateAsync(id);
        showToast('Eliminata', { message: 'Foto eliminata.', variant: 'success' });
      } catch (err) {
        showToast('Errore', { message: 'Errore durante l\'eliminazione.', variant: 'error' });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare questa foto? Questa azione è irreversibile.`)) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      'Conferma eliminazione',
      'Sei sicuro di voler eliminare questa foto? Questa azione è irreversibile.',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Elimina', 
          style: 'destructive',
          onPress: performDelete
        },
      ]
    );
  };

  const movePhoto = async (index: number, direction: 'left' | 'right') => {
    const newPhotos = [...photos];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= photos.length) return;
    
    // Swap
    [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
    
    const updates = newPhotos.map((p, i) => ({ id: p.id, sortOrder: i }));
    
    try {
      await updatePhotoOrder.mutateAsync(updates);
    } catch (err) {
      showToast('Errore', { message: 'Errore durante il riordino.', variant: 'error' });
    }
  };

  return (
    <Card bordered padding="$4" backgroundColor="$color1">
      <YStack gap="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <SizableText size="$4" fontWeight="800">Foto Etichetta</SizableText>
            <SizableText size="$1" color="$color10">Massimo 5 foto per lotto</SizableText>
          </YStack>
          <XStack gap="$2">
            <Button 
              size="$2" 
              theme="active" 
              icon={<Camera size={14} />} 
              onPress={startCamera}
              disabled={photos.length >= 5 || isUploading || isCameraActive}
            >
              Scatta foto
            </Button>
            <Button 
              size="$2" 
              variant="outline" 
              icon={<Upload size={14} />} 
              onPress={() => fileInputRef.current?.click()}
              disabled={photos.length >= 5 || isUploading || isCameraActive}
            >
              Carica da galleria
            </Button>
            {Platform.OS === 'web' && (
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handleFileSelect}
              />
            )}
          </XStack>
        </XStack>

        <Separator />

        {isUploading && (
          <YStack gap="$2" padding="$2" backgroundColor="$color2" borderRadius="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <SizableText size="$2" fontWeight="600">Caricamento in corso...</SizableText>
              <SizableText size="$2">{Math.round(uploadProgress)}%</SizableText>
            </XStack>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
          </YStack>
        )}

        {isCameraActive && (
          <YStack gap="$3" padding="$2" backgroundColor="$color2" borderRadius="$4">
            {cameraError ? (
              <YStack gap="$3" padding="$4" alignItems="center">
                <AlertCircle size={32} color="$red10" />
                <SizableText textAlign="center" color="$red11" size="$2">
                  {cameraError}
                </SizableText>
                <Button size="$3" onPress={stopCamera}>Chiudi</Button>
              </YStack>
            ) : (
              <>
                <View style={styles.cameraPreviewContainer}>
                  {Platform.OS === 'web' ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      style={styles.webVideo} 
                    />
                  ) : (
                    <YStack flex={1} alignItems="center" justifyContent="center">
                      <SizableText>Fotocamera non supportata su questa piattaforma</SizableText>
                    </YStack>
                  )}
                </View>
                <XStack gap="$3" justifyContent="center">
                  <Button theme="active" icon={<Camera size={18} />} onPress={takePhoto}>Scatta</Button>
                  <Button variant="outline" onPress={stopCamera}>Annulla</Button>
                </XStack>
              </>
            )}
          </YStack>
        )}

        <XStack flexWrap="wrap" gap="$3">
          {photos.length === 0 && !isLoading && !isCameraActive && !isUploading && (
            <YStack flex={1} padding="$6" alignItems="center" gap="$2" backgroundColor="$color2" borderRadius="$4" borderStyle="dashed" borderWidth={1} borderColor="$color5">
              <Image size={48} source={{ uri: 'https://cdn.blink.new/icons/photo-placeholder.png' }} opacity={0.3} />
              <SizableText color="$color10" size="$2">Nessuna foto caricata</SizableText>
            </YStack>
          )}
          
          {photos.map((p, index) => (
            <View key={p.id} style={styles.photoContainer}>
              <TouchableOpacity onPress={() => setSelectedPhoto(p.url)}>
                <Image 
                  source={{ uri: p.url }} 
                  width={100} 
                  height={100} 
                  borderRadius="$3"
                  contentFit="cover"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteBadge} 
                onPress={() => handleDelete(p.id)}
              >
                <X size={12} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.maximizeBadge} 
                onPress={() => setSelectedPhoto(p.url)}
              >
                <Maximize2 size={12} color="white" />
              </TouchableOpacity>

              {/* Reorder Buttons */}
              {index > 0 && (
                <TouchableOpacity 
                  style={[styles.orderBadge, { left: 5 }]} 
                  onPress={() => movePhoto(index, 'left')}
                >
                  <ChevronLeft size={14} color="white" />
                </TouchableOpacity>
              )}
              {index < photos.length - 1 && (
                <TouchableOpacity 
                  style={[styles.orderBadge, { right: 35 }]} 
                  onPress={() => movePhoto(index, 'right')}
                >
                  <ChevronRight size={14} color="white" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {isLoading && (
            <YStack width={100} height={100} alignItems="center" justifyContent="center">
              <Spinner size="small" color="$active" />
            </YStack>
          )}
        </XStack>
      </YStack>

      {/* Lightbox */}
      <Modal transparent visible={!!selectedPhoto} animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.9)" justifyContent="center" alignItems="center">
          <TouchableOpacity style={styles.closeLightbox} onPress={() => setSelectedPhoto(null)}>
            <X size={32} color="white" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image 
              source={{ uri: selectedPhoto }} 
              width="90%" 
              height="70%" 
              contentFit="contain" 
            />
          )}
        </YStack>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90D9',
  },
  cameraPreviewContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: 'black',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 2,
  },
  maximizeBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadge: {
    position: 'absolute',
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLightbox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
});
