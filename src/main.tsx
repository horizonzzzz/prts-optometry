import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/main.scss';

createRoot(document.querySelector('#root')!).render(<App />);
