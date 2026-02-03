import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { X, Camera, Loader2 } from 'lucide-react';

interface QRScannerProps {
    onClose: () => void;
    onScan?: (decodedText: string, decodedResult: any) => void;
    title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onClose, onScan, title = "Scan QR Code" }) => {
    const navigate = useNavigate();
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string>('');
    const [cameras, setCameras] = useState<any[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');

    useEffect(() => {
        // Get available cameras
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length > 0) {
                setCameras(devices);
                // Prefer back camera if available
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
                setSelectedCamera(backCamera?.id || devices[0].id);
            } else {
                setError('No cameras found on this device');
            }
        }).catch(err => {
            console.error('Error getting cameras:', err);
            setError('Unable to access camera. Please grant camera permissions.');
        });

        return () => {
            // Cleanup on unmount
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        if (selectedCamera && !isScanning) {
            startScanning();
        }
    }, [selectedCamera]);

    const startScanning = async () => {
        if (!selectedCamera) return;

        try {
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText, decodedResult) => {
                    // Success callback
                    if (onScan) {
                        onScan(decodedText, decodedResult);
                    } else {
                        // Default behavior: navigate to verification or parse the QR data
                        handleDefaultScan(decodedText);
                    }
                },
                (errorMessage) => {
                    // Error callback (just scanning, not critical)
                    // Don't log every frame's "no QR code found"
                }
            );

            setIsScanning(true);
            setError('');
        } catch (err: any) {
            console.error('Scanner start error:', err);
            setError(err.message || 'Failed to start camera');
        }
    };

    const handleDefaultScan = (decodedText: string) => {
        // Stop scanning
        if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
        }

        try {
            // Try to parse as JSON first (for student ID cards)
            const data = JSON.parse(decodedText);

            if (data.studentId || data.id) {
                // Navigate to student verification
                const studentId = data.studentId || data.id;
                navigate(`/verify-student/${studentId}`);
                onClose();
            } else if (data.term && data.year) {
                // Report card QR code
                alert(`Report Card Scanned!\n\nStudent: ${data.name || data.studentName}\nClass: ${data.class || data.classLevel}\nTerm ${data.term}, ${data.year}`);
                onClose();
            } else {
                alert(`QR Code Data:\n${JSON.stringify(data, null, 2)}`);
                onClose();
            }
        } catch (e) {
            // Not JSON, might be a URL
            if (decodedText.startsWith('http')) {
                // Extract student ID from URL if it's a verify link
                const match = decodedText.match(/verify-student\/(\d+)/);
                if (match && match[1]) {
                    navigate(`/verify-student/${match[1]}`);
                    onClose();
                } else {
                    window.open(decodedText, '_blank');
                    onClose();
                }
            } else {
                alert(`Scanned: ${decodedText}`);
                onClose();
            }
        }
    };

    const switchCamera = () => {
        if (cameras.length < 2) return;

        const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
        const nextIndex = (currentIndex + 1) % cameras.length;

        // Stop current scanner
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                setIsScanning(false);
                setSelectedCamera(cameras[nextIndex].id);
            }).catch(console.error);
        }
    };

    const handleClose = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#0052CC] to-[#003D99] p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Camera className="w-6 h-6" />
                        <div>
                            <h3 className="font-bold text-lg">{title}</h3>
                            <p className="text-sm opacity-80">Align QR code within the frame</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-6">
                    {error ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8 text-red-600" />
                            </div>
                            <p className="text-red-600 font-medium mb-2">Camera Error</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                        </div>
                    ) : !isScanning ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 animate-spin text-[#0052CC] mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">Starting camera...</p>
                        </div>
                    ) : null}

                    {/* Scanner viewport */}
                    <div
                        id="qr-reader"
                        className="rounded-lg overflow-hidden"
                        style={{
                            width: '100%',
                            maxWidth: '400px',
                            margin: '0 auto'
                        }}
                    />

                    {/* Instructions */}
                    {isScanning && (
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                📱 Point your camera at the QR code
                            </p>

                            {cameras.length > 1 && (
                                <button
                                    onClick={switchCamera}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                >
                                    🔄 Switch Camera
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>💡 Works with ID cards & report cards</span>
                        <button
                            onClick={handleClose}
                            className="text-[#0052CC] hover:underline font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
