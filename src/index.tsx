import React, { StrictMode } from 'react';
import { ScoreTraining } from './score_training';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('container')!;
const root = createRoot(container);
root.render(<StrictMode>
    <ScoreTraining />
</StrictMode>);
