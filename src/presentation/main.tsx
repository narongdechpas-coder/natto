import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BoothDeck from './booth/BoothDeck';
import '../fonts';
import './deck.css';
import './booth/booth.css';

createRoot(document.getElementById('deck')!).render(
  <StrictMode>
    <BoothDeck />
  </StrictMode>,
);
