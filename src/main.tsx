import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerAppServiceWorker } from './lib/registerSW'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker (with strict guards for preview/dev)
registerAppServiceWorker();
