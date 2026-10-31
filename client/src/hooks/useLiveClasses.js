import { useEffect, useState, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function useLiveClasses(date, batch) {
  const [classes, setClasses] = useState([]);
  const prevRef = useRef(new Set());

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (batch) params.append('batch', batch);
      const { data } = await api.get(`/class-instances?${params}`);

      data.forEach(c => {
        const key = c._id + c.status;
        if (!prevRef.current.has(key) && prevRef.current.size > 0) {
          toast(`🔔 ${c.routineSlotId?.courseId?.code} → ${c.status.toUpperCase()}`, { icon: '⚠️' });
        }
      });
      prevRef.current = new Set(data.map(c => c._id + c.status));
      setClasses(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClasses();
    const interval = setInterval(fetchClasses, 20000);
    return () => clearInterval(interval);
  }, [date, batch]);

  return [classes, fetchClasses];
}