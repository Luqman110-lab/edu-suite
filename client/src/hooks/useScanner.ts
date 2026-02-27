import { useState, useRef, useEffect, useCallback } from 'react';
import { AttendanceTeacher, FaceEmbedding, AttendanceSettings } from '../types/attendance';
import * as faceapi from '@vladmandic/face-api';

declare const jsQR: any;

export type ScannerType = 'qr' | 'face';
export type ScanResult = { success: boolean; message: string; teacher?: AttendanceTeacher };

interface UseScannerProps {
    teachers?: AttendanceTeacher[]; // Optional, for backward compat or we can make it generic data list
    students?: any[]; // For gate attendance
    faceEmbeddings: FaceEmbedding[];
    settings: AttendanceSettings | null;
    personType: 'teacher' | 'student';
    onScanSuccess: (person: any, method: ScannerType) => Promise<void>;
}

export function useScanner({ teachers, students, faceEmbeddings, settings, personType, onScanSuccess }: UseScannerProps) {
    const [showScanner, setShowScanner] = useState(false);
    const [scannerType, setScannerType] = useState<ScannerType>('qr');
    const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanningRef = useRef(false);

    // Helper to find person by ID
    const findPerson = (id: number) => {
        if (personType === 'teacher' && teachers) {
            return teachers.find(t => t.id === id);
        } else if (personType === 'student' && students) {
            return students.find(s => s.id === id);
        }
        return null;
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const loadFaceModels = async () => {
        if (faceModelsLoaded) return false;
        try {
            // Load models from local public/models directory (no CDN dependency)
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setFaceModelsLoaded(true);
            return true;
        } catch (err) {
            console.error('Failed to load face models:', err);
            return false;
        }
    };

    const stopCamera = () => {
        scanningRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowScanner(false);
        setFaceDetected(false);
        setMatchConfidence(null);
    };

    const startCamera = async (type: ScannerType) => {
        setScannerType(type);

        if (type === 'face') {
            const modelsLoaded = await loadFaceModels();
            if (!modelsLoaded) {
                alert('Face recognition models could not be loaded. Please try again.');
                return;
            }
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            streamRef.current = stream;
            scanningRef.current = true;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                videoRef.current.onloadedmetadata = () => {
                    if (type === 'qr') {
                        requestAnimationFrame(runScanner);
                    } else {
                        requestAnimationFrame(runFaceScanner);
                    }
                };
            }
            setShowScanner(true);
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('Camera access is required for scanning.');
        }
    };

    const runScanner = () => {
        if (!videoRef.current || !canvasRef.current || !streamRef.current || !scanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(runScanner);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    handleQRCode(code.data);
                    return;
                }
            }
        } catch (e) {
            console.error('QR scan error:', e);
        }

        if (scanningRef.current) {
            requestAnimationFrame(runScanner);
        }
    };

    const handleQRCode = async (data: string) => {
        scanningRef.current = false; // Pause scanning
        try {
            let teacherId;
            try {
                const parsed = JSON.parse(data);
                teacherId = parsed.teacherId || parsed.id;
            } catch {
                teacherId = parseInt(data);
            }

            if (!teacherId || isNaN(teacherId)) {
                setScanResult({ success: false, message: 'Invalid QR code' });
                setTimeout(() => {
                    scanningRef.current = true;
                    requestAnimationFrame(runScanner);
                }, 2000);
                return;
            }

            const teacher = teachers.find(t => t.id === teacherId);
            if (!teacher) {
                setScanResult({ success: false, message: 'Teacher not found' });
                setTimeout(() => {
                    scanningRef.current = true;
                    requestAnimationFrame(runScanner);
                }, 2000);
                return;
            }

            await onScanSuccess(teacher, 'qr');

            // Resume scanning after success (optional, or maybe stop?)
            // For now, let's keep it paused or restart after delay if we want continuous scanning
            setTimeout(() => {
                if (streamRef.current) {
                    scanningRef.current = true;
                    requestAnimationFrame(runScanner);
                }
            }, 2000);

        } catch (e) {
            console.error('QR handling error', e);
            setScanResult({ success: false, message: 'Error processing QR code' });
            setTimeout(() => {
                scanningRef.current = true;
                requestAnimationFrame(runScanner);
            }, 2000);
        }
    };

    const computeDistance = (a: number[], b: Float32Array): number => {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    };

    const distanceToConfidence = (distance: number): number => {
        const maxDistance = 1.5;
        const confidence = Math.max(0, 1 - (distance / maxDistance));
        return Math.min(1, Math.max(0, confidence));
    };

    const findBestFaceMatch = (descriptor: Float32Array): { personId: number; confidence: number } | null => {
        if (faceEmbeddings.length === 0) return null;

        let bestMatch: { personId: number; confidence: number } | null = null;
        let minDistance = Infinity;
        const threshold = settings?.faceConfidenceThreshold || 0.6;

        for (const emb of faceEmbeddings) {
            if (emb.personType !== personType) continue; // Use dynamic personType
            const distance = computeDistance(emb.embedding, descriptor);
            const confidence = distanceToConfidence(distance);

            if (distance < minDistance && confidence >= threshold) {
                minDistance = distance;
                bestMatch = { personId: emb.personId, confidence }; // Changed teacherId to personId
            }
        }

        return bestMatch;
    };


    const runFaceScanner = async () => {
        if (!videoRef.current || !streamRef.current || !scanningRef.current) return;

        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(runFaceScanner);
            return;
        }

        try {
            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                setFaceDetected(true);

                if (overlayCanvasRef.current) {
                    const canvas = overlayCanvasRef.current;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const box = detection.detection.box;
                        ctx.strokeStyle = '#10B981';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(box.x, box.y, box.width, box.height);
                    }
                }

                const match = findBestFaceMatch(detection.descriptor);
                if (match) {
                    setMatchConfidence(match.confidence);
                    const person = findPerson(match.personId);
                    if (person) {
                        scanningRef.current = false;
                        await onScanSuccess(person, 'face');

                        setTimeout(() => {
                            scanningRef.current = true;
                            if (streamRef.current) requestAnimationFrame(runFaceScanner);
                        }, 3000);
                        return;
                    }
                }
            } else {
                setFaceDetected(false);
                setMatchConfidence(null);

                if (overlayCanvasRef.current) {
                    const ctx = overlayCanvasRef.current.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
                }
            }
        } catch (err) {
            console.error('Face detection error:', err);
        }

        if (scanningRef.current) {
            requestAnimationFrame(runFaceScanner);
        }
    };

    return {
        showScanner,
        scannerType,
        faceDetected,
        matchConfidence,
        scanResult,
        setScanResult,
        videoRef,
        canvasRef,
        overlayCanvasRef,
        startCamera,
        stopCamera,
        faceEmbeddingsCount: faceEmbeddings.length
    };
}
