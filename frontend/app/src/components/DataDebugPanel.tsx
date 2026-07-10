import React, { useState } from 'react';

interface DataDebugPanelProps {
  entries: any[];
}

const DataDebugPanel: React.FC<DataDebugPanelProps> = ({ entries }) => {
  const [isOpen, setIsOpen] = useState(false);

  const anonUserId = localStorage.getItem('anonUserId');
  const entriesKey = anonUserId ? `dailyEntries_${anonUserId}` : 'dailyEntries';
  const localStorageData = JSON.parse(localStorage.getItem(entriesKey) || '[]');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
      >
        Debug Data
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">Data Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div>
          <strong>App State Entries:</strong> {entries.length}
          <ul className="ml-4 text-xs text-gray-600">
            {entries.slice(0, 3).map((entry, i) => (
              <li key={i}>
                {entry.id} - {new Date(entry.timestamp).toLocaleTimeString()}
                {(entry as any).offline && ' (offline)'}
              </li>
            ))}
            {entries.length > 3 && <li>... and {entries.length - 3} more</li>}
          </ul>
        </div>
        
        <div>
          <strong>localStorage Entries:</strong> {localStorageData.length}
          <div className="text-xs text-gray-500 mb-2">Key: {entriesKey}</div>
          <ul className="ml-4 text-xs text-gray-600">
            {localStorageData.slice(0, 3).map((entry: any, i: number) => (
              <li key={i}>
                {entry.id} - {new Date(entry.timestamp).toLocaleTimeString()}
                {entry.offline && ' (offline)'}
              </li>
            ))}
            {localStorageData.length > 3 && <li>... and {localStorageData.length - 3} more</li>}
          </ul>
        </div>
        
        <div className="pt-2 border-t">
          <button
            onClick={() => {
              localStorage.removeItem(entriesKey);
              window.location.reload();
            }}
            className="text-red-600 hover:text-red-800 text-xs"
          >
            Clear localStorage & Reload
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataDebugPanel;