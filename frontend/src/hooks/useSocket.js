import { useEffect } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useSocket(handlers = {}) {
  useEffect(() => {
    if (!socket) socket = io('/');

    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));

    return () => {
      Object.keys(handlers).forEach(event => socket.off(event));
    };
  }, []);
}
