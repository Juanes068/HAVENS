import React from 'react'
import { useApp } from '../../../context/AppContext'
import { PlanItem } from '../types'

interface PlanDeleteModalProps {
  plan: PlanItem | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: (planId: number) => void
}

export const PlanDeleteModal: React.FC<PlanDeleteModalProps> = ({
  plan,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const { t } = useApp()

  if (!plan) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg shrink-0">
            ⚠️
          </div>
          <h3 className="text-lg font-bold font-serif text-[#2C2C2C]">
            {t('confirmDeleteTitle')}
          </h3>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">
          {t('confirmDeleteMessage')}
        </p>

        <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200">
          <p className="text-xs font-bold text-stone-800 font-serif">
            {plan.title}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            📍 {plan.locationName || 'Location specified'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Number(plan.id))}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            {isDeleting ? (
              <span>Deleting...</span>
            ) : (
              <>
                <span>🗑️</span>
                <span>{t('confirmDelete')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
