import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
    onRecordingComplete: (file: File) => void;
    onCancel: () => void;
}

const Icons = {
    Mic: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    Stop: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path fill="currentColor" d="M9 9h6v6H9z" /></svg>,
    Trash: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    Send: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
};

export const AudioRecorder = ({ onRecordingComplete, onCancel }: AudioRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
                onRecordingComplete(file);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);

            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Failed to access microphone", err);
            alert("Microphone permission denied");
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        if (timerRef.current) clearInterval(timerRef.current);
        onCancel();
    };

    useEffect(() => {
        // Auto-start
        startRecording();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, []);

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-full flex-1 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-mono text-red-600 dark:text-red-400 font-medium min-w-[50px]">
                {formatDuration(duration)}
            </span>

            <div className="flex-1 text-xs text-red-400">Recording...</div>

            <button
                onClick={cancelRecording}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-white/50 rounded-full transition-colors"
                title="Cancel"
            >
                <Icons.Trash />
            </button>

            <button
                onClick={stopRecording}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg shadow-red-500/30 transition-all"
                title="Send Voice Note"
            >
                <Icons.Send />
            </button>
        </div>
    );
};
