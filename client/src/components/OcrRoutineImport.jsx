import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function guessRows(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const dayPattern = /\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/i;
  const timePattern = /(\d{1,2}[:.]\d{2})\s*(?:AM|PM)?\s*-\s*(\d{1,2}[:.]\d{2})\s*(?:AM|PM)?/i;
  const codePattern = /\b([A-Z]{2,4}\s?-?\d{2,4})\b/;
  const roomPattern = /(?:room|rm)\.?\s*[:\-]?\s*(\d{1,4})/i;

  return lines.map(line => {
    const dayMatch = line.match(dayPattern);
    const timeMatch = line.match(timePattern);
    const codeMatch = line.match(codePattern);
    const roomMatch = line.match(roomPattern);
    return {
      day: dayMatch ? dayMatch[1].toUpperCase() : '',
      startTime: timeMatch ? timeMatch[1].replace('.', ':') : '',
      endTime: timeMatch ? timeMatch[2].replace('.', ':') : '',
      courseCode: codeMatch ? codeMatch[1].replace(/\s/g, '') : '',
      roomNo: roomMatch ? roomMatch[1] : '',
      raw: line
    };
  }).filter(r => r.day || r.startTime || r.courseCode);
}

export default function OcrRoutineImport({ courses, teachers, batches, isModerator, myBatch, onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);

  const scanImage = async () => {
    if (!file) return toast.error('Choose or capture a photo first');
    setScanning(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/ocr/parse-routine', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRawText(data.text);
      toast.success('Text extracted — review below');
    } catch (err) {
      toast.error(err.response?.data?.error || 'OCR failed');
    }
    setScanning(false);
  };

  const parseText = () => {
    const guessed = guessRows(rawText).map(r => ({
      ...r,
      courseId: courses.find(c => c.code.toLowerCase() === r.courseCode.toLowerCase())?._id || '',
      teacherId: '',
      batch: isModerator ? myBatch : ''
    }));
    if (guessed.length === 0) {
      toast.error('Could not detect any rows — add rows manually below');
    }
    setRows(guessed);
  };

  const addEmptyRow = () => {
    setRows([...rows, { day: 'SUN', startTime: '', endTime: '', roomNo: '', courseId: '', teacherId: '', batch: isModerator ? myBatch : '' }]);
  };

  const updateRow = (idx, field, value) => {
    const copy = [...rows];
    copy[idx] = { ...copy[idx], [field]: value };
    setRows(copy);
  };

  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const importAll = async () => {
    const invalid = rows.some(r => !r.day || !r.startTime || !r.endTime || !r.courseId || !r.batch);
    if (invalid) return toast.error('Every row needs Day, Start, End, Course, and Batch filled in');
    setImporting(true);
    let successCount = 0, failCount = 0;
    for (const r of rows) {
      try {
        await api.post('/routine-slots', {
          day: r.day, startTime: r.startTime, endTime: r.endTime,
          courseId: r.courseId, teacherId: r.teacherId || undefined,
          roomNo: r.roomNo, batch: r.batch
        });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    toast.success(`${successCount} slot(s) created${failCount ? `, ${failCount} failed` : ''}`);
    setImporting(false);
    setRows([]);
    setRawText('');
    setFile(null);
    setOpen(false);
    onImported?.();
  };

  return (
    <div className="ce-card p-5 mb-6">
      <div className="flex justify-between items-center">
        <h2 className="ce-heading">📷 Import Routine from Photo (OCR)</h2>
        <button onClick={() => setOpen(!open)} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
          {open ? 'Close' : 'Open'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-3">

            <p className="text-xs ce-label">
              Upload or take a photo of a printed routine. OCR will extract text — you'll review and
              fix it before any schedule is created. This is an assist tool, not fully automatic.
            </p>

            <input type="file" accept="image/*" capture="environment"
              onChange={e => setFile(e.target.files[0])}
              className="ce-input text-sm" />

            <motion.button whileTap={{ scale: 0.97 }} disabled={scanning} onClick={scanImage}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
              {scanning ? 'Scanning...' : 'Scan Image'}
            </motion.button>

            {rawText && (
              <>
                <label className="text-xs ce-label block mt-3">Extracted text (edit if needed, then click Parse)</label>
                <textarea className="ce-input text-sm h-32 font-mono"
                  value={rawText} onChange={e => setRawText(e.target.value)} />
                <motion.button whileTap={{ scale: 0.97 }} onClick={parseText}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm">
                  Parse into Rows
                </motion.button>
              </>
            )}

            {rows.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="ce-heading text-sm">Review & Confirm Rows ({rows.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200 dark:border-slate-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-800">
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">Day</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">Start</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">End</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">Course</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">Teacher</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">Room</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700 ce-label">Batch</th>
                        <th className="p-1 border border-gray-200 dark:border-slate-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="dark:bg-slate-900/40">
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            <select className="ce-input p-1 text-xs" value={r.day}
                              onChange={e => updateRow(i, 'day', e.target.value)}>
                              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            <input className="ce-input p-1 w-16 text-xs" placeholder="HH:MM"
                              value={r.startTime} onChange={e => updateRow(i, 'startTime', e.target.value)} />
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            <input className="ce-input p-1 w-16 text-xs" placeholder="HH:MM"
                              value={r.endTime} onChange={e => updateRow(i, 'endTime', e.target.value)} />
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            <select className="ce-input p-1 text-xs" value={r.courseId}
                              onChange={e => updateRow(i, 'courseId', e.target.value)}>
                              <option value="">-- Course --</option>
                              {courses.map(c => <option key={c._id} value={c._id}>{c.code}</option>)}
                            </select>
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            <select className="ce-input p-1 text-xs" value={r.teacherId}
                              onChange={e => updateRow(i, 'teacherId', e.target.value)}>
                              <option value="">--</option>
                              {teachers.map(t => <option key={t._id} value={t._id}>{t.fullName}</option>)}
                            </select>
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            <input className="ce-input p-1 w-14 text-xs"
                              value={r.roomNo} onChange={e => updateRow(i, 'roomNo', e.target.value)} />
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1">
                            {isModerator ? (
                              <input disabled value={myBatch}
                                className="border rounded p-1 w-full text-xs bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" />
                            ) : (
                              <select className="ce-input p-1 text-xs" value={r.batch}
                                onChange={e => updateRow(i, 'batch', e.target.value)}>
                                <option value="">--</option>
                                {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="border border-gray-200 dark:border-slate-700 p-1 text-center">
                            <button onClick={() => removeRow(i)} className="text-red-500 dark:text-red-400">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={addEmptyRow} className="text-indigo-600 dark:text-indigo-400 text-sm">+ Add Row</button>
                  <motion.button whileTap={{ scale: 0.97 }} disabled={importing} onClick={importAll}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm ml-auto disabled:opacity-50">
                    {importing ? 'Importing...' : `Create ${rows.length} Slot(s)`}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}