import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PilotDeck from './PilotDeck';
import '../fonts';
import './deck.css';

createRoot(document.getElementById('deck')!).render(
  <StrictMode>
    <PilotDeck />
  </StrictMode>,
);
