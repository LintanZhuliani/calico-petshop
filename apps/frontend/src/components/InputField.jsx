import React from 'react';

export default function InputField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-red-400 rounded-2xl text-slate-800 font-medium outline-none transition-all placeholder:text-slate-300"
      />
    </div>
  );
}
