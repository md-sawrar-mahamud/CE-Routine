import logoImg from '../assets/logo.png';

export default function Logo({ size = 40, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoImg}
        alt="Mymensingh Engineering College Logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain rounded-full select-none"
        draggable="false"
      />

      {showText && (
        <div className="leading-tight">
          <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">CE Routine</p>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 -mt-0.5">Mymensingh Engineering College</p>
        </div>
      )}
    </div>
  );
}