import { useState, useCallback } from 'react';
import { AttendanceSettings } from '../types/attendance';

export interface LocationState {
    lat: number;
    lon: number;
    accuracy: number;
}

export type LocationStatus = 'idle' | 'loading' | 'success' | 'error' | 'outside';

export function useGeolocation(settings: AttendanceSettings | null) {
    const [userLocation, setUserLocation] = useState<LocationState | null>(null);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
    const [distanceFromSchool, setDistanceFromSchool] = useState<number | null>(null);

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

    const verifyLocation = useCallback(async (): Promise<{ lat: number; lon: number; accuracy: number; distance: number } | null> => {
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
    }, [settings]);

    return {
        userLocation,
        locationStatus,
        distanceFromSchool,
        verifyLocation
    };
}
