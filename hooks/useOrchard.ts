import { useContext } from 'react';
import { OrchardContext } from '@/contexts/OrchardContext';
export function useOrchard() { const context = useContext(OrchardContext); if (!context) throw new Error('useOrchard must be used within OrchardProvider'); return context; }
