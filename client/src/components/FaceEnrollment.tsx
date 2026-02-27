import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';

interface FaceEnrollmentProps {
  personId: number;
  personType: 'student' | 'teacher';
  personName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FaceEnrollment({ personId, personType, personName, onSuccess, onCancel }: FaceEnrollmentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      // Load models from local public/models directory (no CDN dependency)
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load face detection models');
      setLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadModels();
    return () => stopCamera();
  }, [loadModels, stopCamera]);

  useEffect(() => {
    if (modelsLoaded && !capturedImage) {
      startCamera();
    }
  }, [modelsLoaded, capturedImage, startCamera]);

  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || capturedImage) return;

    let animationId: number;
    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationId = requestAnimationFrame(detectFace);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }))
          .withFaceLandmarks();

        setFaceDetected(!!detection);

        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            if (detection) {
              const box = detection.detection.box;
              ctx.strokeStyle = '#10B981';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
            }
          }
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }

      animationId = requestAnimationFrame(detectFace);
    };

    detectFace();
    return () => cancelAnimationFrame(animationId);
  }, [modelsLoaded, capturedImage]);

  const captureFace = async () => {
    if (!videoRef.current || !faceDetected) return;

    setCapturing(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('No face detected. Please try again.');
        setCapturing(false);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
      }

      const descriptorArray = Array.from(detection.descriptor as Float32Array);
      setEmbedding(descriptorArray);
      stopCamera();
    } catch (err: any) {
      setError(err.message || 'Failed to capture face');
    }
    setCapturing(false);
  };

  const retake = () => {
    setCapturedImage(null);
    setEmbedding(null);
    setError(null);
    startCamera();
  };

  const saveEmbedding = async () => {
    if (!embedding) return;

    setSaving(true);
    try {
      const response = await fetch('/api/face-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personType,
          personId,
          embedding,
          quality: 0.9
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save face data');
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save face data');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#800020] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading face detection models...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment on first use</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-auto">
        <div className="p-3 sm:p-4 bg-gradient-to-r from-[#800020] to-[#600018] text-white">
          <h3 className="text-base sm:text-lg font-semibold">Face Enrollment</h3>
          <p className="text-xs sm:text-sm opacity-90">{personName}</p>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />
                <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium ${faceDetected
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-black'
                  }`}>
                  {faceDetected ? 'Face detected - Ready to capture' : 'Position your face in frame'}
                </div>
              </>
            ) : (
              <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
            )}
          </div>

          <div className="mt-4 flex gap-3">
            {!capturedImage ? (
              <>
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={captureFace}
                  disabled={!faceDetected || capturing}
                  className="flex-1 px-4 py-2.5 bg-[#800020] text-white rounded-lg hover:bg-[#600018] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {capturing ? 'Capturing...' : 'Capture Face'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={retake}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Retake
                </button>
                <button
                  onClick={saveEmbedding}
                  disabled={saving || !embedding}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Complete'}
                </button>
              </>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Face data is securely stored as a mathematical representation and cannot be used to reconstruct the original image.
          </p>
        </div>
      </div>
    </div>
  );
}
