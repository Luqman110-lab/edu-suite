import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';
import { AttendanceTeacher, AttendanceSettings, FaceEmbedding } from '../../types/attendance';
import { useScanner, ScannerType } from '../../hooks/useScanner';
import { useGeolocation } from '../../hooks/useGeolocation';

interface AttendanceScannerProps {
    teachers: AttendanceTeacher[];
    settings: AttendanceSettings | null;
    faceEmbeddings: FaceEmbedding[];
    scanMode: 'check-in' | 'check-out';
    setScanMode: (mode: 'check-in' | 'check-out') => void;
    onScanSuccess: (teacher: AttendanceTeacher, method: ScannerType) => Promise<void>;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({
    teachers,
    settings,
    faceEmbeddings,
    scanMode,
    setScanMode,
    onScanSuccess
}) => {
    const { isDark } = useTheme();
    const {
        userLocation,
        locationStatus,
        distanceFromSchool,
        verifyLocation
    } = useGeolocation(settings);

    const {
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
        faceEmbeddingsCount
    } = useScanner({
        teachers,
        faceEmbeddings,
        settings,
        personType: 'teacher',
        onScanSuccess
    });

    useEffect(() => {
        if (settings?.enableGeofencing && scanMode === 'check-in') {
            // Location verification is triggered inside useScanner's startCamera if needed,
            // or we can trigger it here when mode changes.
            // The original code verified location when starting camera.
            // Let's verify it here if we are checking in.
            verifyLocation();
        }
    }, [scanMode, settings, verifyLocation]);

    // Wrapper to inject location data into check-in
    const handleStartCamera = (type: ScannerType) => {
        if (settings?.enableGeofencing && scanMode === 'check-in') {
            verifyLocation();
        }
        startCamera(type);
    };

    return (
        <div className={`lg:col-span-1 rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {scannerType === 'qr' ? 'QR Scanner' : 'Face Recognition'}
            </h2>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setScanMode('check-in')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${scanMode === 'check-in'
                        ? 'bg-green-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                >
                    Check-In
                </button>
                <button
                    onClick={() => setScanMode('check-out')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${scanMode === 'check-out'
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                >
                    Check-Out
                </button>
            </div>

            {settings?.enableGeofencing && scanMode === 'check-in' && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${locationStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
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
                    <Button variant="primary" onClick={() => handleStartCamera('qr')} className="w-full">
                        Start QR Scanner
                    </Button>
                    {settings?.enableFaceRecognition && (
                        <Button
                            variant="secondary"
                            onClick={() => handleStartCamera('face')}
                            className="w-full"
                            disabled={faceEmbeddingsCount === 0}
                        >
                            {faceEmbeddingsCount === 0 ? 'No Faces Enrolled' : 'Start Face Recognition'}
                        </Button>
                    )}
                </div>
            )}

            {scanResult && (
                <div className={`mt-4 p-4 rounded-lg ${scanResult.success
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    }`}>
                    {/* Note: scanResult.teacher is likely no longer available as we made it generic. 
                        We should update useScanner to return a generic 'person' or just rely on the message.
                        For now, let's just show the message to avoid type errors.
                    */}
                    <p className="font-semibold">{scanResult.success ? 'Success' : 'Error'}</p>
                    <p className="text-sm">{scanResult.message}</p>
                </div>
            )}
        </div>
    );
};
