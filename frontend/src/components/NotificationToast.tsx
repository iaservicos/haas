import React from 'react';

interface NotificationToastProps {
  message: string;
  onClose: () => void;
}

export function NotificationToast({ message, onClose }: NotificationToastProps) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-800 text-white p-6 shadow-lg flex items-center justify-between z-50">
      <div className="flex-1 text-center">
        <p className="text-lg font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-6 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition"
      >
        OK
      </button>
    </div>
  );
}
