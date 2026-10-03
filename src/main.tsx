import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PlatformAdmin } from './components/platform/PlatformAdmin';
import { installApiAuth } from './utils/auth';
import { installTenantStorage, isPlatformPage } from './utils/tenant';
import './index.css';

// Before anything touches localStorage or the API: scope both to the gym in the URL.
installTenantStorage();
installApiAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPlatformPage() ? <PlatformAdmin /> : <App />}
  </StrictMode>,
);
