import { useState, useEffect } from "react";

type ToastProps = {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    duration?: number;
};

type ToastAction = (props: ToastProps) => void;

// Simple event-based toast system for now
const listeners: Set<ToastAction> = new Set();

function toast(props: ToastProps) {
    listeners.forEach((listener) => listener(props));
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    useEffect(() => {
        const handleToast = (props: ToastProps) => {
            setToasts((prev) => [...prev, props]);
            // Remove after duration
            setTimeout(() => {
                setToasts((prev) => prev.slice(1));
            }, props.duration || 3000);
        };

        listeners.add(handleToast);
        return () => {
            listeners.delete(handleToast);
        };
    }, []);

    return {
        toast,
        toasts,
        dismiss: (index?: number) => console.log("dismiss", index),
    };
}
