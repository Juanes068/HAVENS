import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Footer } from '../components/Footer';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useApp();

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] font-sans antialiased flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#E2DBD0] bg-[#F4EEE2]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to="/discover"
            className="text-xl text-[#2D5A3D] font-serif font-semibold tracking-tight lowercase hover:opacity-80 transition-opacity"
          >
            havens
          </Link>
          
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="dropdown" />
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3.5 py-1.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-[#5a5450] hover:bg-[#E2DBD0]/60 transition-colors cursor-pointer"
            >
              {t('back')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-12 flex-1 w-full space-y-8">
        {/* Document Header */}
        <div className="space-y-3 pb-6 border-b border-[#E2DBD0]">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C47B5A]">
            {t('termsBadge')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2D5A3D] tracking-tight">
            {t('termsTitle')}
          </h1>
          <p className="text-xs text-[#8a8278]">
            {t('termsLastUpdated')}
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-stone max-w-none text-sm text-[#5a5450] leading-relaxed space-y-6">
          <p className="text-base text-[#2C2C2C] font-medium leading-relaxed">
            {t('termsIntro')}
          </p>

          {/* Section 1 */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DBD0] shadow-xs space-y-3">
            <h2 className="text-lg font-serif font-semibold text-[#2D5A3D]">
              {t('termsSec1Title')}
            </h2>
            <p className="leading-relaxed text-[#5a5450]">
              {t('termsSec1Body')}
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DBD0] shadow-xs space-y-3">
            <h2 className="text-lg font-serif font-semibold text-[#2D5A3D]">
              {t('termsSec2Title')}
            </h2>
            <p className="leading-relaxed text-[#5a5450]">
              {t('termsSec2Intro')}
            </p>
            <div className="space-y-2 pt-1 text-xs text-[#5a5450]">
              <p>• {t('termsSec2Item1')}</p>
              <p>• {t('termsSec2Item2')}</p>
              <p>• {t('termsSec2Item3')}</p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DBD0] shadow-xs space-y-3">
            <h2 className="text-lg font-serif font-semibold text-[#2D5A3D]">
              {t('termsSec3Title')}
            </h2>
            <p className="leading-relaxed text-[#5a5450]">
              {t('termsSec3Intro')}
            </p>
            <div className="space-y-2 pt-1 text-xs text-[#5a5450]">
              <p>• {t('termsSec3Item1')}</p>
              <p>• {t('termsSec3Item2')}</p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DBD0] shadow-xs space-y-3">
            <h2 className="text-lg font-serif font-semibold text-[#2D5A3D]">
              {t('termsSec4Title')}
            </h2>
            <p className="leading-relaxed text-[#5a5450]">
              {t('termsSec4Intro')}
            </p>
            <div className="space-y-2 pt-1 text-xs text-[#5a5450]">
              <p>• {t('termsSec4Item1')}</p>
              <p>• {t('termsSec4Item2')}</p>
              <p>• {t('termsSec4Item3')}</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DBD0] shadow-xs space-y-3">
            <h2 className="text-lg font-serif font-semibold text-[#2D5A3D]">
              {t('termsSec5Title')}
            </h2>
            <p className="leading-relaxed text-[#5a5450]">
              {t('termsSec5Intro')}
            </p>
            <div className="space-y-2 pt-1 text-xs text-[#5a5450]">
              <p>• {t('termsSec5Item1')}</p>
              <p>• {t('termsSec5Item2')}</p>
              <p>• {t('termsSec5Item3')}</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2DBD0] shadow-xs space-y-3">
            <h2 className="text-lg font-serif font-semibold text-[#2D5A3D]">
              {t('termsSec6Title')}
            </h2>
            <p className="leading-relaxed text-[#5a5450]">
              {t('termsSec6Body')}
            </p>
          </section>
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default TermsPage;
