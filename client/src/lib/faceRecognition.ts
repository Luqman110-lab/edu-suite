declare const faceapi: any;

export interface FaceEmbedding {
  id: number;
  personId: number;
  personType: 'student' | 'teacher';
  embedding: number[];
  schoolId: number;
}

export interface FaceMatch {
  personId: number;
  personType: 'student' | 'teacher';
  confidence: number;
  distance: number;
}

let modelsLoaded = false;
let modelsLoading = false;

export async function loadFaceModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelsLoading) {
    while (modelsLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return modelsLoaded;
  }

  modelsLoading = true;
  try {
    if (typeof faceapi === 'undefined') {
      throw new Error('Face API library not loaded');
    }

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    return true;
  } catch (err) {
    console.error('Failed to load face models:', err);
    return false;
  } finally {
    modelsLoading = false;
  }
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export async function detectFaceFromVideo(video: HTMLVideoElement): Promise<Float32Array | null> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor as Float32Array;
  } catch (err) {
    console.error('Face detection error:', err);
    return null;
  }
}

export async function detectFaceFromCanvas(canvas: HTMLCanvasElement): Promise<Float32Array | null> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor as Float32Array;
  } catch (err) {
    console.error('Face detection error:', err);
    return null;
  }
}

export function computeEuclideanDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Embedding dimensions must match');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function distanceToConfidence(distance: number): number {
  const maxDistance = 1.5;
  const confidence = Math.max(0, 1 - (distance / maxDistance));
  return Math.min(1, Math.max(0, confidence));
}

export function findBestMatch(
  descriptor: Float32Array,
  embeddings: FaceEmbedding[],
  threshold: number = 0.6
): FaceMatch | null {
  if (embeddings.length === 0) return null;

  let bestMatch: FaceMatch | null = null;
  let minDistance = Infinity;

  for (const emb of embeddings) {
    const distance = computeEuclideanDistance(descriptor, emb.embedding);
    const confidence = distanceToConfidence(distance);
    
    if (distance < minDistance && confidence >= threshold) {
      minDistance = distance;
      bestMatch = {
        personId: emb.personId,
        personType: emb.personType,
        confidence,
        distance
      };
    }
  }

  return bestMatch;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export function verifyLocation(
  userLat: number,
  userLon: number,
  schoolLat: number,
  schoolLon: number,
  radiusMeters: number
): { isWithinRadius: boolean; distance: number } {
  const distance = calculateHaversineDistance(userLat, userLon, schoolLat, schoolLon);
  return {
    isWithinRadius: distance <= radiusMeters,
    distance
  };
}
