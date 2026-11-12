import { useEffect, useState } from 'react';
import { foodStyles } from '@/services/content';
import { useOrchard } from './useOrchard';
export function usePreferences() {
  const orchard = useOrchard();
  const [likes,setLikes] = useState('');
  const [dislikes,setDislikes] = useState('');
  const [styles,setStyles] = useState<string[]>([]);
  const [saved,setSaved] = useState(false);
  useEffect(() => { if(orchard.ready) { setLikes(orchard.data.preferences.likes); setDislikes(orchard.data.preferences.dislikes); setStyles(orchard.data.preferences.styles); } },[orchard.ready,orchard.data.preferences]);
  const editLikes = (value: string) => { setLikes(value); setSaved(false); };
  const editDislikes = (value: string) => { setDislikes(value); setSaved(false); };
  const toggleStyle = (style: string) => { setStyles(s => s.includes(style) ? s.filter(i => i !== style) : [...s,style]); setSaved(false); };
  const save = () => { orchard.setPreferences({ likes: likes.trim(),dislikes: dislikes.trim(),styles }); setSaved(true); };
  return { ...orchard, likes,dislikes,styles,foodStyles,saved,editLikes,editDislikes,toggleStyle,save };
}
