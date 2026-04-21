import { format } from 'date-fns';

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return format(date, 'dd/MM/yyyy HH:mm:ss');
    } catch {
        return dateString;
    }
}

export function formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

export function formatTransferRate(kbps: number): string {
    if (kbps < 1024) {
        return `${kbps.toFixed(0)} Kbps`;
    }
    const mbps = kbps / 1024;
    if (mbps < 1024) {
        return `${mbps.toFixed(2)} Mbps`;
    }
    const gbps = mbps / 1024;
    return `${gbps.toFixed(2)} Gbps`;
}

export function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

