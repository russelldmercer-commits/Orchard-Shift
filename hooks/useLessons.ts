import { useState } from 'react';
import { lessons } from '@/services/content';
import { useOrchard } from './useOrchard';
export function useLessons(id?: string) {
  const orchard = useOrchard();
  const [saved,setSaved] = useState(false);
  const lesson = lessons.find(l => l.id === id) ?? lessons[0];
  const note = orchard.data.reflections[lesson.id] ?? '';
  const setNote = (text: string) => { orchard.saveReflection(lesson.id,text); setSaved(false); };
  return { ...orchard, lessons,lesson,note,setNote,saved,confirmSaved: () => setSaved(true),complete: orchard.data.completedLessons.includes(lesson.id) };
}
