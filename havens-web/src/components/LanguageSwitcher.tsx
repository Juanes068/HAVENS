import React, { useState, useRef, useEffect } from 'react';
import { useApp, Language } from '../context/AppContext';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'segmented';
  className?: string;
}

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { language, setLanguage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'segmented') {
    return (
      <div className={`flex items-center gap-1 p-1 bg-[#E2DBD0]/60 rounded-xl ${className}`}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              language === lang.code
                ? 'bg-white text-[#2D5A3D] shadow-2xs'
                : 'text-[#5a5450] hover:text-[#2C2C2C]'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 px-3 rounded-xl border border-[#E2DBD0] bg-white/70 hover:bg-white transition-all flex items-center gap-1.5 text-xs font-bold text-[#5a5450] hover:text-[#2C2C2C] cursor-pointer shadow-2xs"
        title="Change Language / Cambiar Idioma / Changer de Langue"
        aria-label="Language Selector"
      >
        <span className="text-sm leading-none">🌐</span>
        <span className="uppercase text-[11px] font-bold text-[#2D5A3D]">
          {LANGUAGES.find((l) => l.code === language)?.code || language}
        </span>
        <span className="text-[9px] text-[#8a8278]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-[#E2DBD0] py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1 text-[10px] font-bold text-[#8a8278] uppercase tracking-wider border-b border-[#E2DBD0]/50 mb-1">
            Language
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#F0EAE0] transition-colors cursor-pointer ${
                language === lang.code
                  ? 'text-[#2D5A3D] font-bold bg-[#eaf3ed]/60'
                  : 'text-[#5a5450]'
              }`}
            >
              <span>{lang.label}</span>
              {language === lang.code && (
                <span className="text-[11px] font-bold text-[#2D5A3D]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
