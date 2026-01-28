import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Teacher {
  id: number;
  name: string;
  initials?: string;
  phone?: string;
  email?: string;
  classAssigned?: string;
  subjectsAssigned?: string[];
  photoUrl?: string;
}

interface TeacherRecord {
  id: number;
  teacherId: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInMethod?: string;
  checkOutMethod?: string;
  status: string;
  leaveType?: string;
  notes?: string;
}

interface AttendanceSettings {
  schoolStartTime: string;
  lateThresholdMinutes: number;
  schoolEndTime: string;
  enableFaceRecognition?: boolean;
  requireFaceForTeachers?: boolean;
  faceConfidenceThreshold?: number;
  enableGeofencing?: boolean;
  schoolLatitude?: number;
  schoolLongitude?: number;
  geofenceRadiusMeters?: number;
}

interface FaceEmbedding {
  id: number;
  personId: number;
  personType: string;
  embedding: number[];
}

declare const faceapi: any;

const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const TeacherAttendance: React.FC = () => {
  const { isDark } = useTheme();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'check-in' | 'check-out'>('check-in');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; teacher?: Teacher } | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState('sick');
  const [leaveNotes, setLeaveNotes] = useState('');
  const [scannerType, setScannerType] = useState<'qr' | 'face'>('qr');
  const [faceEmbeddings, setFaceEmbeddings] = useState<FaceEmbedding[]>([]);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'outside'>('idle');
  const [distanceFromSchool, setDistanceFromSchool] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const leaveTypes = ['sick', 'personal', 'official', 'emergency', 'annual'];

  useEffect(() => {
    fetchData();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teachersRes, recordsRes, settingsRes, embeddingsRes] = await Promise.all([
        fetch('/api/teachers', { credentials: 'include' }),
        fetch(`/api/teacher-attendance?date=${selectedDate}`, { credentials: 'include' }),
        fetch('/api/attendance-settings', { credentials: 'include' }),
        fetch('/api/face-embeddings?personType=teacher', { credentials: 'include' }),
      ]);
      
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (recordsRes.ok) setRecords(await recordsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (embeddingsRes.ok) setFaceEmbeddings(await embeddingsRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  };

  const loadFaceModels = async () => {
    if (faceModelsLoaded || typeof faceapi === 'undefined') return false;
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
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

  const findBestFaceMatch = (descriptor: Float32Array): { teacherId: number; confidence: number } | null => {
    if (faceEmbeddings.length === 0) return null;
    
    let bestMatch: { teacherId: number; confidence: number } | null = null;
    let minDistance = Infinity;
    const threshold = settings?.faceConfidenceThreshold || 0.6;
    
    for (const emb of faceEmbeddings) {
      if (emb.personType !== 'teacher') continue;
      const distance = computeDistance(emb.embedding, descriptor);
      const confidence = distanceToConfidence(distance);
      
      if (distance < minDistance && confidence >= threshold) {
        minDistance = distance;
        bestMatch = { teacherId: emb.personId, confidence };
      }
    }
    
    return bestMatch;
  };

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const verifyLocation = async (): Promise<{ lat: number; lon: number; accuracy: number; distance: number } | null> => {
    if (!settings?.enableGeofencing || !settings?.schoolLatitude || !settings?.schoolLongitude) {
      return null;
    }
    
    setLocationStatus('loading');
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus('error');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          const distance = calculateHaversineDistance(lat, lon, settings.schoolLatitude!, settings.schoolLongitude!);
          
          setUserLocation({ lat, lon, accuracy });
          setDistanceFromSchool(distance);
          
          const radius = settings.geofenceRadiusMeters || 100;
          if (distance <= radius) {
            setLocationStatus('success');
          } else {
            setLocationStatus('outside');
          }
          
          resolve({ lat, lon, accuracy, distance });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationStatus('error');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const startCamera = async (type: 'qr' | 'face' = 'qr') => {
    setScannerType(type);
    
    if (type === 'face') {
      const modelsLoaded = await loadFaceModels();
      if (!modelsLoaded && typeof faceapi === 'undefined') {
        alert('Face recognition is not available. Please refresh the page and try again.');
        return;
      }
    }
    
    if (settings?.enableGeofencing && scanMode === 'check-in') {
      await verifyLocation();
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
          const teacher = teachers.find(t => t.id === match.teacherId);
          if (teacher) {
            scanningRef.current = false;
            await processAttendance(match.teacherId, 'face');
            
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
  
  const runScanner = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    
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
      const jsQR = (window as any).jsQR;
      if (jsQR) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleQRCode(code.data);
          return;
        }
      }
    } catch (e) {
      console.error('QR scan error:', e);
    }
    
    requestAnimationFrame(runScanner);
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

  const handleQRCode = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      const teacherId = parsed.teacherId || parsed.id;
      
      if (!teacherId) {
        setScanResult({ success: false, message: 'Invalid QR code format' });
        setTimeout(() => requestAnimationFrame(runScanner), 2000);
        return;
      }
      
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) {
        setScanResult({ success: false, message: 'Teacher not found' });
        setTimeout(() => requestAnimationFrame(runScanner), 2000);
        return;
      }
      
      await processAttendance(teacherId);
      
      setTimeout(() => {
        if (streamRef.current) requestAnimationFrame(runScanner);
      }, 2000);
      
    } catch (e) {
      const teacherId = parseInt(data);
      if (!isNaN(teacherId)) {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          await processAttendance(teacherId);
        } else {
          setScanResult({ success: false, message: 'Teacher not found' });
        }
      } else {
        setScanResult({ success: false, message: 'Invalid QR code' });
      }
      
      setTimeout(() => {
        if (streamRef.current) requestAnimationFrame(runScanner);
      }, 2000);
    }
  };

  const processAttendance = async (teacherId: number, method: string = 'qr') => {
    const endpoint = scanMode === 'check-in' 
      ? '/api/teacher-attendance/check-in' 
      : '/api/teacher-attendance/check-out';
    
    const teacher = teachers.find(t => t.id === teacherId);
    
    const payload: any = { teacherId, method };
    
    if (scanMode === 'check-in' && userLocation && settings?.enableGeofencing) {
      payload.latitude = userLocation.lat;
      payload.longitude = userLocation.lon;
      payload.accuracy = userLocation.accuracy;
      payload.distance = distanceFromSchool;
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setScanResult({ 
          success: true, 
          message: scanMode === 'check-in' 
            ? `Checked in at ${result.checkInTime} - ${result.status === 'late' ? 'LATE' : 'On Time'}`
            : `Checked out at ${result.checkOutTime}`,
          teacher
        });
        await fetchData();
      } else {
        setScanResult({ success: false, message: result.message, teacher });
      }
    } catch (err) {
      setScanResult({ success: false, message: 'Network error', teacher });
    }
  };

  const handleManualCheckIn = async (teacherId: number) => {
    setScanMode('check-in');
    await processAttendance(teacherId);
  };

  const handleManualCheckOut = async (teacherId: number) => {
    setScanMode('check-out');
    await processAttendance(teacherId);
  };

  const handleMarkLeave = async () => {
    if (!selectedTeacherId) return;
    
    try {
      const response = await fetch('/api/teacher-attendance/mark-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          date: selectedDate,
          leaveType,
          notes: leaveNotes,
        }),
      });
      
      if (response.ok) {
        setShowLeaveModal(false);
        setSelectedTeacherId(null);
        setLeaveType('sick');
        setLeaveNotes('');
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to mark leave');
      }
    } catch (err) {
      console.error('Failed to mark leave:', err);
    }
  };

  const getTeacherStatus = (teacherId: number) => {
    const record = records.find(r => r.teacherId === teacherId);
    if (!record) return { status: 'not_checked_in', record: null };
    return { status: record.status, record };
  };

  const stats = {
    total: teachers.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: teachers.length - records.filter(r => r.status !== 'on_leave').length,
    onLeave: records.filter(r => r.status === 'on_leave').length,
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Teacher Attendance
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Staff check-in/check-out tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Staff</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Late</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>On Leave</p>
          <p className="text-2xl font-bold text-blue-600">{stats.onLeave}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {scannerType === 'qr' ? 'QR Scanner' : 'Face Recognition'}
          </h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setScanMode('check-in')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                scanMode === 'check-in'
                  ? 'bg-green-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Check-In
            </button>
            <button
              onClick={() => setScanMode('check-out')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                scanMode === 'check-out'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Check-Out
            </button>
          </div>

          {settings?.enableGeofencing && scanMode === 'check-in' && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              locationStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              locationStatus === 'outside' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
              locationStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
              locationStatus === 'loading' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              {locationStatus === 'idle' && 'Location verification required for check-in'}
              {locationStatus === 'loading' && 'Verifying location...'}
              {locationStatus === 'success' && `Within school grounds (${Math.round(distanceFromSchool || 0)}m)`}
              {locationStatus === 'outside' && `Outside school grounds (${Math.round(distanceFromSchool || 0)}m away)`}
              {locationStatus === 'error' && 'Location unavailable - check permissions'}
            </div>
          )}

          {showScanner ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                {scannerType === 'face' && (
                  <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full" />
                )}
                {scannerType === 'qr' ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg"></div>
                  </div>
                ) : (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{
                    backgroundColor: faceDetected ? (matchConfidence ? '#10B981' : '#F59E0B') : '#6B7280'
                  }}>
                    {faceDetected 
                      ? (matchConfidence ? `Match: ${Math.round(matchConfidence * 100)}%` : 'Searching...') 
                      : 'No face detected'}
                  </div>
                )}
              </div>
              <Button variant="danger" onClick={stopCamera} className="w-full">
                Stop Scanner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button variant="primary" onClick={() => startCamera('qr')} className="w-full">
                Start QR Scanner
              </Button>
              {settings?.enableFaceRecognition && (
                <Button 
                  variant="secondary" 
                  onClick={() => startCamera('face')} 
                  className="w-full"
                  disabled={faceEmbeddings.length === 0}
                >
                  {faceEmbeddings.length === 0 ? 'No Faces Enrolled' : 'Start Face Recognition'}
                </Button>
              )}
            </div>
          )}

          {scanResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              scanResult.success 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            }`}>
              {scanResult.teacher && (
                <div className="flex items-center gap-3 mb-2">
                  {scanResult.teacher.photoUrl ? (
                    <img src={scanResult.teacher.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-lg">
                      {scanResult.teacher.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{scanResult.teacher.name}</p>
                    <p className="text-sm opacity-75">{scanResult.teacher.classAssigned || 'Staff'}</p>
                  </div>
                </div>
              )}
              <p className="text-sm">{scanResult.message}</p>
            </div>
          )}
        </div>

        <div className={`lg:col-span-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Staff List</h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {teachers.map(teacher => {
                const { status, record } = getTeacherStatus(teacher.id);
                return (
                  <div key={teacher.id} className={`p-4 ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {teacher.photoUrl ? (
                          <img src={teacher.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                            {teacher.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {teacher.classAssigned || 'Staff'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        status === 'on_leave' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {status === 'not_checked_in' ? 'Waiting' : 
                         status === 'on_leave' ? 'On Leave' :
                         status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {record?.checkInTime && <span>In: {record.checkInTime}</span>}
                        {record?.checkOutTime && <span className="ml-3">Out: {record.checkOutTime}</span>}
                        {status === 'on_leave' && <span>{record?.leaveType}</span>}
                        {status === 'not_checked_in' && <span>Not checked in</span>}
                      </div>
                      <div className="flex gap-2">
                        {status === 'not_checked_in' && (
                          <>
                            <button 
                              onClick={() => handleManualCheckIn(teacher.id)}
                              className="min-h-[44px] px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-lg active:bg-green-700"
                            >
                              Check In
                            </button>
                            <button 
                              onClick={() => { setSelectedTeacherId(teacher.id); setShowLeaveModal(true); }}
                              className={`min-h-[44px] px-4 py-3 text-sm font-medium rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 active:bg-gray-700' : 'border-gray-300 text-gray-700 active:bg-gray-100'}`}
                            >
                              Leave
                            </button>
                          </>
                        )}
                        {(status === 'present' || status === 'late') && !record?.checkOutTime && (
                          <button 
                            onClick={() => handleManualCheckOut(teacher.id)}
                            className={`min-h-[44px] px-5 py-3 text-sm font-medium rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 active:bg-gray-700' : 'border-gray-300 text-gray-700 active:bg-gray-100'}`}
                          >
                            Check Out
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop Table View */}
            <table className="hidden md:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`sticky top-0 ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Teacher</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-In</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-Out</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {teachers.map(teacher => {
                  const { status, record } = getTeacherStatus(teacher.id);
                  return (
                    <tr key={teacher.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {teacher.photoUrl ? (
                            <img src={teacher.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                              {teacher.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{teacher.name}</span>
                            {teacher.classAssigned && (
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.classAssigned}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {record?.checkInTime || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {record?.checkOutTime || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          status === 'on_leave' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {status === 'not_checked_in' ? 'Not Checked In' : 
                           status === 'on_leave' ? `On Leave (${record?.leaveType || ''})` :
                           status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {status === 'not_checked_in' && (
                            <>
                              <Button size="sm" variant="success" onClick={() => handleManualCheckIn(teacher.id)}>
                                In
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedTeacherId(teacher.id);
                                setShowLeaveModal(true);
                              }}>
                                Leave
                              </Button>
                            </>
                          )}
                          {(status === 'present' || status === 'late') && !record?.checkOutTime && (
                            <Button size="sm" variant="outline" onClick={() => handleManualCheckOut(teacher.id)}>
                              Out
                            </Button>
                          )}
                          {status === 'on_leave' && (
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {record?.leaveType}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mark Leave</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  {leaveTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                <textarea
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button variant="outline" onClick={() => { setShowLeaveModal(false); setSelectedTeacherId(null); }}>Cancel</Button>
              <Button variant="primary" onClick={handleMarkLeave}>Mark Leave</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
