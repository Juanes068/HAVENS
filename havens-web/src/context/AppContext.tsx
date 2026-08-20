import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'es' | 'fr'

export interface Translations {
  discover: string
  social: string
  calendar: string
  saved: string
  plans: string
  messages: string
  profile: string
  signOut: string
  createPlan: string
  myPlans: string
  deleteEvent: string
  postPlan: string
  confirmDeleteTitle: string
  confirmDeleteMessage: string
  cancel: string
  confirmDelete: string
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    discover: 'Discover',
    social: 'Social',
    calendar: 'Calendar',
    saved: 'Saved',
    plans: 'Plans',
    messages: 'Messages',
    profile: 'Profile',
    signOut: 'Sign out',
    createPlan: 'Create Plan',
    myPlans: 'My Plans',
    deleteEvent: 'Delete Event',
    postPlan: 'Post Plan',
    confirmDeleteTitle: 'Delete Plan Confirmation',
    confirmDeleteMessage: 'Are you sure you want to delete this plan? This action cannot be undone.',
    cancel: 'Cancel',
    confirmDelete: 'Delete Plan',
  },
  es: {
    discover: 'Descubrir',
    social: 'Social',
    calendar: 'Calendario',
    saved: 'Guardados',
    plans: 'Planes',
    messages: 'Mensajes',
    profile: 'Perfil',
    signOut: 'Cerrar sesión',
    createPlan: 'Crear Plan',
    myPlans: 'Mis Planes',
    deleteEvent: 'Eliminar Plan',
    postPlan: 'Publicar Plan',
    confirmDeleteTitle: 'Confirmar Eliminación',
    confirmDeleteMessage: '¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.',
    cancel: 'Cancelar',
    confirmDelete: 'Eliminar Plan',
  },
  fr: {
    discover: 'Découvrir',
    social: 'Social',
    calendar: 'Calendrier',
    saved: 'Enregistrés',
    plans: 'Plans',
    messages: 'Messages',
    profile: 'Profil',
    signOut: 'Se déconnecter',
    createPlan: 'Créer un Plan',
    myPlans: 'Mes Plans',
    deleteEvent: 'Supprimer le Plan',
    postPlan: 'Publier le Plan',
    confirmDeleteTitle: 'Confirmation de Suppression',
    confirmDeleteMessage: 'Êtes-vous sûr de vouloir supprimer ce plan ? Cette action ne peut pas être annulée.',
    cancel: 'Annuler',
    confirmDelete: 'Supprimer le Plan',
  },
}

interface AppContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof Translations) => string
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('havens_lang')
    return (saved as Language) || 'en'
  })

  useEffect(() => {
    localStorage.setItem('havens_lang', language)
  }, [language])

  // Clear theme from localStorage and root DOM if previously set
  useEffect(() => {
    localStorage.removeItem('havens_theme')
    document.documentElement.classList.remove('dark')
  }, [])

  const t = (key: keyof Translations): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key
  }

  return (
    <AppContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider')
  }
  return context
}
