import { createRoot } from 'react-dom/client';
import '../src/tokens/tokens.css';
import { Sandbox } from './Sandbox';

createRoot(document.getElementById('root')!).render(<Sandbox />);
