import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { ClassLevel, Gender, Student, SchoolSettings } from '../types';
import { useClassNames } from '../hooks/use-class-names';

interface WebcamCaptureProps {
    onCapture: (imageData: string) => void;
    onCancel: () => void;
    isDark: boolean;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onCancel, isDark }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setError('Unable to access camera. Please ensure camera permissions are granted.');
        }
    };

    const captureWithCountdown = () => {
        setCountdown(3);
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev === 1) {
                    clearInterval(interval);
                    capturePhoto();
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                onCapture(imageData);
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className={`rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    📷 Capture Student Photo
                </h3>

                {error ? (
                    <div className="text-center py-8">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button variant="outline" onClick={onCancel}>Close</Button>
                    </div>
                ) : (
                    <>
                        <div className="relative rounded-lg overflow-hidden bg-black mb-4">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-auto"
                            />
                            {countdown !== null && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <span className="text-8xl font-bold text-white animate-pulse">{countdown}</span>
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={onCancel}>Cancel</Button>
                            <Button onClick={captureWithCountdown} disabled={countdown !== null}>
                                {countdown !== null ? 'Capturing...' : '📸 Capture Photo'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
    address?: string;
}

interface MedicalInfo {
    bloodGroup?: string;
    allergies?: string;
    medicalConditions?: string;
    doctorName?: string;
    doctorPhone?: string;
}

interface StudentFormData {
    // Step 1: Basic Info
    name: string;
    dateOfBirth?: string;
    gender: string;
    nationality?: string;
    religion?: string;
    photoBase64?: string;

    // Step 2: Academic
    classLevel: string;
    stream: string;
    indexNumber: string;
    paycode?: string;
    admissionDate?: string;
    previousSchool?: string;
    boardingStatus?: string;

    // Step 3: Contacts
    parentName?: string;
    parentContact?: string;
    emergencyContacts?: EmergencyContact[];

    // Step 4: Medical
    medicalInfo?: MedicalInfo;

    // Admin flags
    specialCases: { absenteeism: boolean; sickness: boolean; fees: boolean };

    // Edit mode
    id?: number;
}

interface StudentFormWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: StudentFormData) => Promise<void>;
    initialData?: Partial<Student>;
    settings: SchoolSettings | null;
    isDark: boolean;
    students: Student[];
}

const STEPS = [
    { id: 1, title: 'Basic Info', icon: '👤' },
    { id: 2, title: 'Academic', icon: '📚' },
    { id: 3, title: 'Contacts', icon: '📞' },
    { id: 4, title: 'Medical', icon: '🏥' },
    { id: 5, title: 'Review', icon: '✅' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const NATIONALITIES = ['Ugandan', 'Kenyan', 'Tanzanian', 'Rwandan', 'South Sudanese', 'Congolese', 'Other'];
const RELIGIONS = ['Catholic', 'Anglican', 'Muslim', 'Pentecostal', 'SDA', 'Orthodox', 'Other'];

export const StudentFormWizard: React.FC<StudentFormWizardProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    settings,
    isDark,
    students
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [showWebcam, setShowWebcam] = useState(false);
    const [autoGenerateIndex, setAutoGenerateIndex] = useState(!initialData?.id);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { getDisplayName, getAllClasses } = useClassNames();

    const [formData, setFormData] = useState<StudentFormData>(() => ({
        name: initialData?.name || '',
        dateOfBirth: initialData?.dateOfBirth || '',
        gender: initialData?.gender || Gender.Male,
        nationality: initialData?.nationality || 'Ugandan',
        religion: initialData?.religion || '',
        photoBase64: initialData?.photoBase64 || '',
        classLevel: initialData?.classLevel || ClassLevel.P1,
        stream: initialData?.stream || '',
        indexNumber: initialData?.indexNumber || '',
        paycode: initialData?.paycode || '',
        admissionDate: initialData?.admissionDate || new Date().toISOString().split('T')[0],
        previousSchool: initialData?.previousSchool || '',
        boardingStatus: initialData?.boardingStatus || 'day',
        parentName: initialData?.parentName || '',
        parentContact: initialData?.parentContact || '',
        emergencyContacts: initialData?.emergencyContacts || [{ name: '', relationship: '', phone: '' }],
        medicalInfo: initialData?.medicalInfo || {},
        specialCases: initialData?.specialCases || { absenteeism: false, sickness: false, fees: false },
        id: initialData?.id,
    }));

    // Auto-generate index number when class changes or on mount
    useEffect(() => {
        if (autoGenerateIndex && !initialData?.id) {
            const centreNumber = settings?.centreNumber || '670135';
            const year = new Date().getFullYear();

            // Find highest index for this class
            const classStudents = students.filter(s => s.classLevel === formData.classLevel);
            const maxIndex = classStudents.reduce((max, s) => {
                const match = s.indexNumber.match(/\/(\d+)$/);
                const num = match ? parseInt(match[1], 10) : 0;
                return Math.max(max, num);
            }, 0);

            const nextSeq = String(maxIndex + 1).padStart(3, '0');
            setFormData(prev => ({
                ...prev,
                indexNumber: `${centreNumber}/${nextSeq}`
            }));
        }
    }, [formData.classLevel, autoGenerateIndex, settings, students, initialData]);

    // Update stream when class changes
    useEffect(() => {
        const classStreams = settings?.streams[formData.classLevel] || [];
        if (!formData.stream || !classStreams.includes(formData.stream)) {
            setFormData(prev => ({
                ...prev,
                stream: classStreams[0] || ''
            }));
        }
    }, [formData.classLevel, settings]);

    if (!isOpen) return null;

    const inputClasses = `w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
        }`;

    const labelClasses = `block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    const validateStep = (step: number): boolean => {
        const newErrors: { [key: string]: string } = {};

        switch (step) {
            case 1:
                if (!formData.name.trim()) newErrors.name = 'Name is required';
                break;
            case 2:
                if (!formData.indexNumber.trim()) newErrors.indexNumber = 'Index number is required';
                // Check for duplicate index
                const duplicate = students.find(s =>
                    s.indexNumber === formData.indexNumber && s.id !== formData.id
                );
                if (duplicate) newErrors.indexNumber = 'This index number already exists';
                break;
            case 3:
                // Optional step
                break;
            case 4:
                // Optional step
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 5));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        setSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, photoBase64: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const addEmergencyContact = () => {
        setFormData(prev => ({
            ...prev,
            emergencyContacts: [...(prev.emergencyContacts || []), { name: '', relationship: '', phone: '' }]
        }));
    };

    const removeEmergencyContact = (index: number) => {
        setFormData(prev => ({
            ...prev,
            emergencyContacts: prev.emergencyContacts?.filter((_, i) => i !== index) || []
        }));
    };

    const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
        setFormData(prev => ({
            ...prev,
            emergencyContacts: prev.emergencyContacts?.map((c, i) =>
                i === index ? { ...c, [field]: value } : c
            ) || []
        }));
    };

    const currentStreams = settings?.streams[formData.classLevel] || [];

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        {/* Photo Section */}
                        <div className="flex flex-col items-center mb-6">
                            <div className={`w-32 h-32 rounded-xl overflow-hidden mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                {formData.photoBase64 ? (
                                    <img src={formData.photoBase64} alt="Student" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">👤</div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setShowWebcam(true)}>
                                    📷 Camera
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    📁 Upload
                                </Button>
                                {formData.photoBase64 && (
                                    <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, photoBase64: '' }))}>
                                        ✕ Remove
                                    </Button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </div>

                        <div>
                            <label className={labelClasses}>Full Name *</label>
                            <input
                                type="text"
                                className={`${inputClasses} ${errors.name ? 'border-red-500' : ''}`}
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                                placeholder="e.g. MUKASA JOHN"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Date of Birth</label>
                                <input
                                    type="date"
                                    className={inputClasses}
                                    value={formData.dateOfBirth || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Gender *</label>
                                <select
                                    className={inputClasses}
                                    value={formData.gender}
                                    onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as Gender }))}
                                >
                                    <option value={Gender.Male}>Male</option>
                                    <option value={Gender.Female}>Female</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Nationality</label>
                                <select
                                    className={inputClasses}
                                    value={formData.nationality || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                                >
                                    <option value="">Select...</option>
                                    {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Religion</label>
                                <select
                                    className={inputClasses}
                                    value={formData.religion || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, religion: e.target.value }))}
                                >
                                    <option value="">Select...</option>
                                    {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Class *</label>
                                <select
                                    className={inputClasses}
                                    value={formData.classLevel}
                                    onChange={e => setFormData(prev => ({ ...prev, classLevel: e.target.value as ClassLevel }))}
                                >
                                    {getAllClasses().map(({ level, displayName }) => (
                                        <option key={level} value={level}>{displayName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Stream</label>
                                <input
                                    type="text"
                                    list="streams-list"
                                    className={inputClasses}
                                    value={formData.stream}
                                    onChange={e => setFormData(prev => ({ ...prev, stream: e.target.value }))}
                                    placeholder="Select or type..."
                                />
                                <datalist id="streams-list">
                                    {currentStreams.map((s: string) => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Index Number *</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    className={`${inputClasses} flex-1 ${errors.indexNumber ? 'border-red-500' : ''}`}
                                    value={formData.indexNumber}
                                    onChange={e => setFormData(prev => ({ ...prev, indexNumber: e.target.value }))}
                                    disabled={autoGenerateIndex && !initialData?.id}
                                    placeholder="000000/000"
                                />
                                {!initialData?.id && (
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={autoGenerateIndex}
                                            onChange={e => setAutoGenerateIndex(e.target.checked)}
                                            className="w-4 h-4 rounded text-primary-600"
                                        />
                                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Auto</span>
                                    </label>
                                )}
                            </div>
                            {errors.indexNumber && <p className="text-red-500 text-xs mt-1">{errors.indexNumber}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>School Paycode</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.paycode || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, paycode: e.target.value }))}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Boarding Status</label>
                                <select
                                    className={inputClasses}
                                    value={formData.boardingStatus || 'day'}
                                    onChange={e => setFormData(prev => ({ ...prev, boardingStatus: e.target.value }))}
                                >
                                    <option value="day">Day Scholar</option>
                                    <option value="boarding">Boarder</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Admission Date</label>
                                <input
                                    type="date"
                                    className={inputClasses}
                                    value={formData.admissionDate || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, admissionDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Previous School</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.previousSchool || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, previousSchool: e.target.value }))}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Parent/Guardian Name</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.parentName || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                                    placeholder="Mr./Mrs. Name"
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Parent Contact Phone</label>
                                <input
                                    type="tel"
                                    className={inputClasses}
                                    value={formData.parentContact || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, parentContact: e.target.value }))}
                                    placeholder="07XX XXX XXX"
                                />
                            </div>
                        </div>

                        <div className={`border-t pt-4 mt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                    🚨 Emergency Contacts
                                </h4>
                                <Button variant="outline" size="sm" onClick={addEmergencyContact}>
                                    + Add Contact
                                </Button>
                            </div>

                            {(formData.emergencyContacts || []).map((contact, index) => (
                                <div key={index} className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Contact #{index + 1}
                                        </span>
                                        {(formData.emergencyContacts?.length || 0) > 1 && (
                                            <button
                                                onClick={() => removeEmergencyContact(index)}
                                                className="text-red-500 text-sm hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={contact.name}
                                            onChange={e => updateEmergencyContact(index, 'name', e.target.value)}
                                            placeholder="Name"
                                        />
                                        <input
                                            type="text"
                                            className={inputClasses}
                                            value={contact.relationship}
                                            onChange={e => updateEmergencyContact(index, 'relationship', e.target.value)}
                                            placeholder="Relationship"
                                        />
                                        <input
                                            type="tel"
                                            className={inputClasses}
                                            value={contact.phone}
                                            onChange={e => updateEmergencyContact(index, 'phone', e.target.value)}
                                            placeholder="Phone"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Blood Group</label>
                                <select
                                    className={inputClasses}
                                    value={formData.medicalInfo?.bloodGroup || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        medicalInfo: { ...prev.medicalInfo, bloodGroup: e.target.value }
                                    }))}
                                >
                                    <option value="">Unknown</option>
                                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Allergies</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.medicalInfo?.allergies || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        medicalInfo: { ...prev.medicalInfo, allergies: e.target.value }
                                    }))}
                                    placeholder="Food, medicine allergies..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Medical Conditions</label>
                            <textarea
                                className={`${inputClasses} h-24 resize-none`}
                                value={formData.medicalInfo?.medicalConditions || ''}
                                onChange={e => setFormData(prev => ({
                                    ...prev,
                                    medicalInfo: { ...prev.medicalInfo, medicalConditions: e.target.value }
                                }))}
                                placeholder="Asthma, diabetes, eye problems, etc..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Doctor Name</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.medicalInfo?.doctorName || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        medicalInfo: { ...prev.medicalInfo, doctorName: e.target.value }
                                    }))}
                                    placeholder="Dr. Name"
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Doctor Phone</label>
                                <input
                                    type="tel"
                                    className={inputClasses}
                                    value={formData.medicalInfo?.doctorPhone || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        medicalInfo: { ...prev.medicalInfo, doctorPhone: e.target.value }
                                    }))}
                                    placeholder="07XX XXX XXX"
                                />
                            </div>
                        </div>

                        <div className={`border-t pt-4 mt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                Administrative Flags
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.specialCases?.fees}
                                        onChange={e => setFormData(prev => ({
                                            ...prev,
                                            specialCases: { ...prev.specialCases, fees: e.target.checked }
                                        }))}
                                        className="w-4 h-4 rounded text-primary-600"
                                    />
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Fees Issue</span>
                                </label>
                                <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.specialCases?.sickness}
                                        onChange={e => setFormData(prev => ({
                                            ...prev,
                                            specialCases: { ...prev.specialCases, sickness: e.target.checked }
                                        }))}
                                        className="w-4 h-4 rounded text-primary-600"
                                    />
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Medical</span>
                                </label>
                                <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.specialCases?.absenteeism}
                                        onChange={e => setFormData(prev => ({
                                            ...prev,
                                            specialCases: { ...prev.specialCases, absenteeism: e.target.checked }
                                        }))}
                                        className="w-4 h-4 rounded text-primary-600"
                                    />
                                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Absent</span>
                                </label>
                            </div>
                        </div>
                    </div>
                );

            case 5:
                return (
                    <div className="space-y-4">
                        <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            ✅ Review Student Information
                        </h4>

                        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <div className="flex items-center gap-4 mb-4">
                                {formData.photoBase64 ? (
                                    <img src={formData.photoBase64} alt="Student" className="w-20 h-20 rounded-lg object-cover" />
                                ) : (
                                    <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-2xl ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}>👤</div>
                                )}
                                <div>
                                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.name || 'No Name'}</h3>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {getDisplayName(formData.classLevel)} {formData.stream && `• ${formData.stream}`} • {formData.gender === 'M' ? 'Male' : 'Female'}
                                    </p>
                                    <p className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formData.indexNumber}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {formData.dateOfBirth && (
                                    <div><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>DOB:</span> {formData.dateOfBirth}</div>
                                )}
                                {formData.nationality && (
                                    <div><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nationality:</span> {formData.nationality}</div>
                                )}
                                {formData.boardingStatus && (
                                    <div><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Status:</span> {formData.boardingStatus === 'boarding' ? 'Boarder' : 'Day Scholar'}</div>
                                )}
                                {formData.parentName && (
                                    <div><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Parent:</span> {formData.parentName}</div>
                                )}
                                {formData.parentContact && (
                                    <div><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Contact:</span> {formData.parentContact}</div>
                                )}
                                {formData.medicalInfo?.bloodGroup && (
                                    <div><span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Blood:</span> {formData.medicalInfo.bloodGroup}</div>
                                )}
                            </div>

                            {(formData.emergencyContacts?.length || 0) > 0 && formData.emergencyContacts?.[0]?.name && (
                                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                                    <p className={`text-xs uppercase font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Emergency Contacts</p>
                                    {formData.emergencyContacts?.filter(c => c.name).map((c, i) => (
                                        <p key={i} className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {c.name} ({c.relationship}) - {c.phone}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`w-full sm:max-w-2xl rounded-t-2xl sm:rounded-xl shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} max-h-[95vh] sm:max-h-[90vh] flex flex-col`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {initialData?.id ? 'Edit Student' : 'Register New Student'}
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Step {currentStep} of 5 • {STEPS[currentStep - 1].title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Steps */}
                <div className={`px-6 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => (
                            <button
                                key={step.id}
                                onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                                className={`flex flex-col items-center transition-all ${currentStep >= step.id
                                    ? 'text-primary-600'
                                    : isDark ? 'text-gray-500' : 'text-gray-400'
                                    } ${currentStep > step.id ? 'cursor-pointer hover:text-primary-500' : 'cursor-default'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${currentStep === step.id
                                    ? 'bg-primary-600 text-white scale-110 shadow-lg'
                                    : currentStep > step.id
                                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900'
                                        : isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    {currentStep > step.id ? '✓' : step.icon}
                                </div>
                                <span className="text-xs hidden sm:block">{step.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderStep()}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <Button
                        variant="outline"
                        onClick={currentStep === 1 ? onClose : handleBack}
                    >
                        {currentStep === 1 ? 'Cancel' : '← Back'}
                    </Button>

                    {currentStep === 5 ? (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Saving...' : initialData?.id ? 'Update Student' : '✓ Register Student'}
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>
                            Next →
                        </Button>
                    )}
                </div>
            </div>

            {showWebcam && (
                <WebcamCapture
                    onCapture={(imageData) => {
                        setFormData(prev => ({ ...prev, photoBase64: imageData }));
                        setShowWebcam(false);
                    }}
                    onCancel={() => setShowWebcam(false)}
                    isDark={isDark}
                />
            )}
        </div>
    );
};

export default StudentFormWizard;
