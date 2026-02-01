
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CheckpointsPanel } from './CheckpointsPanel';
import '../content/style.css'; // Reuse styles if possible, or add new ones

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <CheckpointsPanel />
    </React.StrictMode>
  );
}
