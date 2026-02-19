import React, { useRef } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';
import { GateStudent, GateSettings } from '../../types/gate';
import { FaceEmbedding } from '../../types/attendance';
import { useScanner, ScannerType } from '../../hooks/useScanner';

interface GateScannerProps {
    students: GateStudent[];
    settings: GateSettings | null;
    faceEmbeddings: FaceEmbedding[];
    scanMode: 'check-in' | 'check-out';
    setScanMode: (mode: 'check-in' | 'check-out') => void;
    onScanSuccess: (student: GateStudent, method: ScannerType) => Promise<void>;
}

export const GateScanner: React.FC<GateScannerProps> = ({
    students,
    settings,
    faceEmbeddings,
    scanMode,
    setScanMode,
    onScanSuccess
}) => {
    const { isDark } = useTheme();

    // Map GateSettings to AttendanceSettings style for useScanner
    // Note: useScanner expects AttendanceSettings which has lateThresholdMinutes etc.
    // GateSettings has similar fields.
    const scannerSettings = settings ? {
        ...settings,
        schoolLatitude: 0, // Gate doesn't use geofencing in this context
        schoolLongitude: 0,
        geofenceRadiusMeters: 0,
        enableGeofencing: false
    } : null;

    const {
        showScanner,
        scannerType,
        faceDetected,
        matchConfidence,
        scanResult,
        videoRef,
        canvasRef,
        overlayCanvasRef,
        startCamera,
        stopCamera,
        faceEmbeddingsCount
    } = useScanner({
        students,
        faceEmbeddings,
        settings: scannerSettings,
        personType: 'student',
        onScanSuccess
    });

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
                    <p className="font-semibold">{scanResult.success ? 'Success' : 'Error'}</p>
                    <p className="text-sm">{scanResult.message}</p>
                </div>
            )}

            {settings && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    <p>School starts: {settings.schoolStartTime}</p>
                    <p>Late after: {settings.lateThresholdMinutes} mins</p>
                    <p>School ends: {settings.schoolEndTime}</p>
                </div>
            )}
        </div>
    );
};
