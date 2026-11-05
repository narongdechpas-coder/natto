import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Deck from './Deck';
import '../fonts';
import './deck.css';

createRoot(document.getElementById('deck')!).render(
  <StrictMode>
    <Deck />
  </StrictMode>,
);
