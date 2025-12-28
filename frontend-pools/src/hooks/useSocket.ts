'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config';

// Pool interface matching backend
interface Pool {
    poolId: number;
    title: string;
    description: string;
    category: string;
    outcomeA: string;
    outcomeB: string;
    creator: string;
    expiry: number;
    tokenType: number;
    totalA: number;
    totalB: number;
    settled: boolean;
    winningOutcome?: number;
    depositClaimed: boolean;
    createdAt: string;
    updatedAt: string;
}

type SocketEventHandler<T> = (data: T) => void;

interface UseSocketOptions {
    onPoolCreated?: SocketEventHandler<Pool>;
    onPoolUpdated?: SocketEventHandler<Pool>;
    onPoolSettled?: SocketEventHandler<Pool>;
    onPoolsList?: SocketEventHandler<Pool[]>;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export function useSocket(options: UseSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null);
    const optionsRef = useRef(options);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        // Connect to Socket.IO server
        const socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[WebSocket] Connected to server');
            optionsRef.current.onConnect?.();
        });

        socket.on('disconnect', () => {
            console.log('[WebSocket] Disconnected from server');
            optionsRef.current.onDisconnect?.();
        });

        // Pool events
        socket.on('pool:created', (pool: Pool) => {
            console.log('[WebSocket] Pool created:', pool.title);
            optionsRef.current.onPoolCreated?.(pool);
        });

        socket.on('pool:updated', (pool: Pool) => {
            console.log('[WebSocket] Pool updated:', pool.poolId);
            optionsRef.current.onPoolUpdated?.(pool);
        });

        socket.on('pool:settled', (pool: Pool) => {
            console.log('[WebSocket] Pool settled:', pool.title);
            optionsRef.current.onPoolSettled?.(pool);
        });

        socket.on('pools:list', (pools: Pool[]) => {
            console.log('[WebSocket] Received pools list:', pools.length);
            optionsRef.current.onPoolsList?.(pools);
        });

        socket.on('connect_error', (error) => {
            console.error('[WebSocket] Connection error:', error.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const disconnect = useCallback(() => {
        socketRef.current?.disconnect();
    }, []);

    const isConnected = useCallback(() => {
        return socketRef.current?.connected ?? false;
    }, []);

    return {
        socket: socketRef.current,
        disconnect,
        isConnected,
    };
}
