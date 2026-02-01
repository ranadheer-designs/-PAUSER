
import React, { useEffect, useState } from 'react';
import { CheckpointPayloadSchema } from '@pauser/common';
import { z } from 'zod';

type CheckpointPayload = z.infer<typeof CheckpointPayloadSchema>;

export const CheckpointsPanel: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<CheckpointPayload[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointPayload | null>(null);

  useEffect(() => {
    // Listen for checkpoints from background/content script
    const listener = (message: any) => {
      if (message.type === 'NEW_CHECKPOINT') {
        const result = CheckpointPayloadSchema.safeParse(message.payload);
        if (result.success) {
          setCheckpoints(prev => [...prev, result.data]);
        }
      }
      if (message.type === 'TRIGGER_CHECKPOINT') {
         // Logic to activate a specific checkpoint
         const cp = checkpoints.find(c => c.timestamp === message.timestamp);
         if (cp) setActiveCheckpoint(cp);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [checkpoints]);

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-xl font-bold mb-4">Learning Checkpoints</h1>
      
      {activeCheckpoint ? (
        <div className="border border-blue-500 rounded p-4 mb-4 bg-gray-800">
          <h2 className="text-lg font-semibold text-blue-300">{activeCheckpoint.title}</h2>
          <p className="text-sm mt-2 text-gray-300">{activeCheckpoint.task}</p>
          
          <div className="mt-4">
             {/* Placeholder for Runner */}
             <div className="bg-black p-2 rounded h-32 flex items-center justify-center text-gray-500 border border-gray-700">
                {activeCheckpoint.runner.toUpperCase()} RUNNER
             </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button 
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 text-sm"
              onClick={() => console.log('Run Code')}
            >
              Run / Check
            </button>
            <button 
              className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-sm"
              onClick={() => setActiveCheckpoint(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 mt-10">
          <p>Watching for teaching moments...</p>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">History</h3>
        <ul className="space-y-2">
          {checkpoints.map((cp, idx) => (
            <li 
              key={idx} 
              className="bg-gray-800 p-2 rounded cursor-pointer hover:bg-gray-700 text-sm border-l-2 border-transparent hover:border-blue-500"
              onClick={() => setActiveCheckpoint(cp)}
            >
              <div className="flex justify-between">
                <span>{cp.title}</span>
                <span className="text-xs text-gray-500">{Math.floor(cp.timestamp / 60)}:{(cp.timestamp % 60).toString().padStart(2, '0')}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
