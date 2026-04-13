import React, { useEffect } from 'react';

interface NotificationToastProps {
  message: string;
  type: 'sucesso' | 'erro' | 'aviso' | 'info';
  onClose: () => void;
  autoClose?: number; // milliseconds
}

export function NotificationToast({
  message,
  type,
  onClose,
  autoClose = 5000,
}: NotificationToastProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const bgColor = {
    sucesso: 'bg-green-50 border-green-200',
    erro: 'bg-red-50 border-red-200',
    aviso: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }[type];

  const textColor = {
    sucesso: 'text-green-800',
    erro: 'text-red-800',
    aviso: 'text-yellow-800',
    info: 'text-blue-800',
  }[type];

  const iconColor = {
    sucesso: 'text-green-600',
    erro: 'text-red-600',
    aviso: 'text-yellow-600',
    info: 'text-blue-600',
  }[type];

  const icon = {
    sucesso: '✓',
    erro: '✕',
    aviso: '⚠',
    info: 'ℹ',
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 max-w-md border rounded-lg p-4 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${bgColor}`}
      role="alert"
    >
      <div className={`text-xl font-bold ${iconColor} flex-shrink-0`}>{icon}</div>
      <div className={`text-sm ${textColor} flex-1`}>{message}</div>
      <button
        onClick={onClose}
        className={`text-xl font-bold ${textColor} hover:opacity-70 flex-shrink-0`}
      >
        ✕
      </button>
    </div>
  );
}
