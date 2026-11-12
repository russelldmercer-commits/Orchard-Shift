import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
export function useLayout() { const [width,setWidth] = useState(375); useEffect(() => { const update = () => setWidth(Math.max(320,Dimensions.get('window').width || 375)); update(); const sub = Dimensions.addEventListener('change',update); return () => sub.remove(); },[]); return { width, wide: width >= 600 }; }
