
import React, { useState, useMemo } from 'react';
import type { LogEntry } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ImportIcon } from './icons/ImportIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SpannerIcon } from './icons/SpannerIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

// A mapping of action names to their corresponding icons for visual distinction in the log.
const actionIcons: { [key: string]: React.ReactElement } = {
    'Added Raw Material': <PlusIcon />,
    'Updated Raw Material': <PencilIcon />,
    'Updated Storage Item': <PencilIcon />,
    'Imported Raw Materials': <ImportIcon />,
    'Imported Storage Items': <ImportIcon />,
    'Started Production': <ArrowRightIcon />,
    'Finished Production': <ArrowRightIcon />,
    'Sent to Repair': <SpannerIcon />,
    'Item Repaired': <SpannerIcon />,
    'Updated Test Results': <CheckCircleIcon />,
    'Imported Test Results': <ImportIcon />,
};

// A mapping of action names to color styles to further differentiate log entry types.
const actionColors: { [key: string]: string } = {
    'Added Raw Material': 'bg-blue-100 text-blue-800',
    'Updated Raw Material': 'bg-yellow-100 text-yellow-800',
    'Updated Storage Item': 'bg-yellow-100 text-yellow-800',
    'Imported Raw Materials': 'bg-green-100 text-green-800',
    'Imported Storage Items': 'bg-green-100 text-green-800',
    'Started Production': 'bg-indigo-100 text-indigo-800',
    'Finished Production': 'bg-green-100 text-green-800',
    'Sent to Repair': 'bg-red-100 text-red-800',
    'Item Repaired': 'bg-green-100 text-green-800',
    'Updated Test Results': 'bg-purple-100 text-purple-800',
    'Imported Test Results': 'bg-teal-100 text-teal-800',
};

interface ViewLogProps {
  logs: LogEntry[];
}

const ViewLog: React.FC<ViewLogProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);

  // Memoize the filtered logs to prevent re-calculation on every render.
  const filteredLogs = useMemo(() => {
    // Sort logs by timestamp descending (Latest first)
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    if (!searchTerm) return sortedLogs;
    
    const lowercasedFilter = searchTerm.toLowerCase();
    return sortedLogs.filter(log => 
      log.action.toLowerCase().includes(lowercasedFilter) || 
      log.details.toLowerCase().includes(lowercasedFilter) ||
      log.username.toLowerCase().includes(lowercasedFilter)
    );
  }, [logs, searchTerm]);

  const handleCopyDailyLog = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyLogs = filteredLogs.filter(log => log.timestamp >= today.getTime());
    
    if (dailyLogs.length === 0) {
        alert("No log entries for today to copy.");
        return;
    }
    
    const logText = dailyLogs
        .map(l => `${new Date(l.timestamp).toLocaleString()}\t${l.username}\t${l.action}\t${l.details}`)
        .join('\n');

    navigator.clipboard.writeText(logText).then(() => {
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy daily log.');
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
        <button 
          onClick={handleCopyDailyLog}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm w-36 transition-all"
        >
          {copyStatus ? 'Copied!' : 'Copy Daily Log'}
        </button>
      </div>
      
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search logs by action, details, or user..." 
          className="block w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <ul className="divide-y divide-gray-200">
          {filteredLogs.map(log => (
            <li key={log.id} className="p-4 flex items-start space-x-4 hover:bg-gray-50 transition-colors">
              <div className={`flex-shrink-0 p-2 rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                {actionIcons[log.action] || <div className="h-5 w-5" />}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-baseline">
                   <div>
                    <p className="font-semibold text-gray-800">{log.action}</p>
                    <p className="text-xs text-gray-500">by {log.username}</p>
                  </div>
                  <p className="text-xs text-gray-500 flex-shrink-0 ml-4">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                    {/* Parse details to highlight critical alerts like quantity changes */}
                    {log.details.split(/(\[QUANTITY CHANGED:.*?\])/g).map((part, i) => 
                        part.startsWith('[QUANTITY CHANGED') ? 
                        <span key={i} className="font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200 text-xs ml-1">{part}</span> : 
                        part
                    )}
                </div>
              </div>
            </li>
          ))}
          {filteredLogs.length === 0 && (
            <li className="p-8 text-center text-gray-500">
              {logs.length > 0 ? "No log entries match your search." : "No log entries have been recorded yet."}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ViewLog;
