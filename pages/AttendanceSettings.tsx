import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface AttendanceSettingsData {
  id?: number;
  schoolStartTime: string;
  lateThresholdMinutes: number;
  gateCloseTime: string;
  schoolEndTime: string;
  enableFaceRecognition: boolean;
  enableQrScanning: boolean;
  requireFaceForGate: boolean;
  requireFaceForTeachers: boolean;
  faceConfidenceThreshold: number;
  enableGeofencing: boolean;
  schoolLatitude: number | null;
  schoolLongitude: number | null;
  geofenceRadiusMeters: number;
  periodsPerDay: number;
  periodDurationMinutes: number;
}

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  className?: string;
}) => {
  const variantClasses = {
    primary: 'bg-[#800020] hover:bg-[#600018] text-white',
    secondary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const AttendanceSettings: React.FC = () => {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState<AttendanceSettingsData>({
    schoolStartTime: '08:00',
    lateThresholdMinutes: 15,
    gateCloseTime: '08:30',
    schoolEndTime: '16:30',
    enableFaceRecognition: false,
    enableQrScanning: true,
    requireFaceForGate: false,
    requireFaceForTeachers: false,
    faceConfidenceThreshold: 0.6,
    enableGeofencing: false,
    schoolLatitude: null,
    schoolLongitude: null,
    geofenceRadiusMeters: 100,
    periodsPerDay: 8,
    periodDurationMinutes: 40,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/attendance-settings', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/attendance-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Attendance settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
    setSaving(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser' });
      return;
    }
    
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings(prev => ({
          ...prev,
          schoolLatitude: position.coords.latitude,
          schoolLongitude: position.coords.longitude,
        }));
        setGettingLocation(false);
        setMessage({ type: 'success', text: 'School location captured successfully!' });
      },
      (error) => {
        setGettingLocation(false);
        setMessage({ type: 'error', text: 'Failed to get location. Please enable location permissions.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Attendance Settings
        </h1>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Configure attendance tracking, face recognition, and location verification
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className={`rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          School Hours
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              School Start Time
            </label>
            <input
              type="time"
              value={settings.schoolStartTime}
              onChange={(e) => setSettings(prev => ({ ...prev, schoolStartTime: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Late After (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.lateThresholdMinutes}
              onChange={(e) => setSettings(prev => ({ ...prev, lateThresholdMinutes: parseInt(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Gate Close Time
            </label>
            <input
              type="time"
              value={settings.gateCloseTime}
              onChange={(e) => setSettings(prev => ({ ...prev, gateCloseTime: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              School End Time
            </label>
            <input
              type="time"
              value={settings.schoolEndTime}
              onChange={(e) => setSettings(prev => ({ ...prev, schoolEndTime: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>
      </div>

      <div className={`rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Check-In Methods
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableQrScanning}
              onChange={(e) => setSettings(prev => ({ ...prev, enableQrScanning: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
            />
            <div>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>Enable QR Code Scanning</span>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Allow check-in/check-out using student and teacher ID card QR codes
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableFaceRecognition}
              onChange={(e) => setSettings(prev => ({ ...prev, enableFaceRecognition: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
            />
            <div>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>Enable Face Recognition</span>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Allow check-in/check-out using facial recognition (requires face enrollment)
              </p>
            </div>
          </label>
        </div>
      </div>

      {settings.enableFaceRecognition && (
        <div className={`rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Face Recognition Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Match Confidence Threshold ({Math.round(settings.faceConfidenceThreshold * 100)}%)
              </label>
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={settings.faceConfidenceThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, faceConfidenceThreshold: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Higher values require stricter face matching (recommended: 60-70%)
              </p>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireFaceForGate}
                onChange={(e) => setSettings(prev => ({ ...prev, requireFaceForGate: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
              />
              <div>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>Require Face for Students</span>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Students must use face recognition (QR alone will not work)
                </p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireFaceForTeachers}
                onChange={(e) => setSettings(prev => ({ ...prev, requireFaceForTeachers: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
              />
              <div>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>Require Face for Teachers</span>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Teachers must use face recognition for check-in
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      <div className={`rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Location Verification (Geofencing)
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableGeofencing}
              onChange={(e) => setSettings(prev => ({ ...prev, enableGeofencing: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
            />
            <div>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>Enable Location Verification</span>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Verify that teachers are at the school when checking in
              </p>
            </div>
          </label>

          {settings.enableGeofencing && (
            <div className="space-y-4 mt-4 pl-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    School Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 0.3476"
                    value={settings.schoolLatitude || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, schoolLatitude: parseFloat(e.target.value) || null }))}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    School Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g., 32.5825"
                    value={settings.schoolLongitude || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, schoolLongitude: parseFloat(e.target.value) || null }))}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
              </Button>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Allowed Radius (meters)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.geofenceRadiusMeters}
                  onChange={(e) => setSettings(prev => ({ ...prev, geofenceRadiusMeters: parseInt(e.target.value) || 100 }))}
                  className={`w-full max-w-xs px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Teachers must be within this distance from school to check in
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-lg border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Class Period Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Periods Per Day
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={settings.periodsPerDay}
              onChange={(e) => setSettings(prev => ({ ...prev, periodsPerDay: parseInt(e.target.value) || 8 }))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Period Duration (minutes)
            </label>
            <input
              type="number"
              min="20"
              max="90"
              value={settings.periodDurationMinutes}
              onChange={(e) => setSettings(prev => ({ ...prev, periodDurationMinutes: parseInt(e.target.value) || 40 }))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchSettings}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default AttendanceSettings;
