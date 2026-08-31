export type Language = 'en' | 'es' | 'fr';

export interface TranslationDictionary {
  // Navigation & General
  discover: string;
  social: string;
  calendar: string;
  saved: string;
  plans: string;
  messages: string;
  profile: string;
  signOut: string;
  back: string;
  language: string;

  // Footer & Branding
  footerTagline: string;
  termsAndConditions: string;
  allRightsReserved: string;

  // Discover Page
  discoverTitle: string;
  discoverSubtitle: string;
  discoverFeed: string;
  interactiveMap: string;
  activePlansBanner: string;
  viewOnMap: string;
  fetchingEvents: string;
  failedLoadEvents: string;
  noMoreEvents: string;
  noMoreEventsSub: string;
  refreshFeed: string;

  // Swipe & Map & Card Actions
  going: string;
  confirm: string;
  maybe: string;
  pass: string;
  host: string;
  past: string;
  readOnly: string;
  ptsReward: string;
  hostedBy: string;
  spotsFilled: string;
  viewDetails: string;
  shareEvent: string;
  eventLinkCopied: string;
  ageRange: string;
  location: string;
  dateTime: string;
  attendees: string;
  spotsRemaining: string;
  attendingToast: string;
  maybeToast: string;
  passedToast: string;

  // Calendar Page
  calendarTitle: string;
  calendarSubtitle: string;
  upcomingPlans: string;
  pastGatherings: string;
  noPlansOnDate: string;
  selectDatePrompt: string;
  today: string;

  // Saved Page
  savedTitle: string;
  savedSubtitle: string;
  savedPlans: string;
  noSavedEvents: string;

  // Plans Page & Management
  createPlan: string;
  myPlans: string;
  postPlan: string;
  postGathering: string;
  editPlan: string;
  deleteEvent: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  cancel: string;
  confirmDelete: string;
  planTitleLabel: string;
  planTitlePlaceholder: string;
  planDescriptionLabel: string;
  planDescriptionPlaceholder: string;
  planLocationLabel: string;
  planLocationPlaceholder: string;
  planDateLabel: string;
  planTimeLabel: string;
  planVisibilityLabel: string;
  planHobbiesLabel: string;
  planAgeRangeLabel: string;
  planPointsLabel: string;
  planSubmitButton: string;
  planSaveSuccess: string;
  noPlansCreatedYet: string;

  // Social & Circles
  socialTitle: string;
  socialSubtitle: string;
  meetTab: string;
  circlesTab: string;
  connectionsTab: string;
  recommendedMembers: string;
  createCircle: string;
  joinCircle: string;
  leaveCircle: string;
  member: string;
  members: string;
  sendMessage: string;
  connect: string;
  connected: string;
  pending: string;
  matchScore: string;
  sharedHobbies: string;
  noMembersFound: string;
  noCirclesFound: string;
  noConnectionsFound: string;

  // Profile Settings
  profileSettings: string;
  bioLabel: string;
  bioPlaceholder: string;
  dobLabel: string;
  neighbourhoodLabel: string;
  cityLabel: string;
  hobbiesLabel: string;
  saveChanges: string;
  inviteCodeLabel: string;
  copyCode: string;
  codeCopied: string;

  // Auth / Login Page
  brandTagline: string;
  signInTab: string;
  registerTab: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordsMismatch: string;
  passwordsMatch: string;
  inviteCodePlaceholder: string;
  locationPlaceholder: string;
  signInButton: string;
  registerButton: string;
  processing: string;
  termsDisclaimer: string;
  termsCheckboxLabel: string;
  termsCheckboxRequired: string;
  settingUpSession: string;
  authErrorMissingFields: string;
  authErrorInvalidCreds: string;
  authSuccessRedirect: string;

  // Terms and Conditions Page (Exact 6 Sections)
  termsBadge: string;
  termsTitle: string;
  termsLastUpdated: string;
  termsIntro: string;
  termsSec1Title: string;
  termsSec1Body: string;
  termsSec2Title: string;
  termsSec2Intro: string;
  termsSec2Item1: string;
  termsSec2Item2: string;
  termsSec2Item3: string;
  termsSec3Title: string;
  termsSec3Intro: string;
  termsSec3Item1: string;
  termsSec3Item2: string;
  termsSec4Title: string;
  termsSec4Intro: string;
  termsSec4Item1: string;
  termsSec4Item2: string;
  termsSec4Item3: string;
  termsSec5Title: string;
  termsSec5Intro: string;
  termsSec5Item1: string;
  termsSec5Item2: string;
  termsSec5Item3: string;
  termsSec6Title: string;
  termsSec6Body: string;
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    // Navigation & General
    discover: 'Discover',
    social: 'Social',
    calendar: 'Calendar',
    saved: 'Saved',
    plans: 'Plans',
    messages: 'Messages',
    profile: 'Profile',
    signOut: 'Sign out',
    back: '← Back',
    language: 'Language',

    // Footer & Branding
    footerTagline: 'Genuine bonds through shared passions',
    termsAndConditions: 'Terms & Conditions',
    allRightsReserved: 'All rights reserved.',

    // Discover Page
    discoverTitle: 'Discover community plans',
    discoverSubtitle: 'Explore local gatherings via discovery swipe cards or interactive map markers',
    discoverFeed: 'Discover Feed',
    interactiveMap: 'Interactive Map',
    activePlansBanner: 'active plan(s) (marked Going/Maybe). These are archived from your swipe feed and kept live on your Map & Calendar.',
    viewOnMap: 'View on Map',
    fetchingEvents: 'Fetching live events from havens backend...',
    failedLoadEvents: 'Failed to load community events. Please try again.',
    noMoreEvents: 'No more events in your area right now',
    noMoreEventsSub: 'Check back soon or broaden your search in Social & Circles.',
    refreshFeed: 'Refresh Discovery Feed',

    // Swipe & Map & Card Actions
    going: 'Going',
    confirm: 'Confirm',
    maybe: 'Maybe',
    pass: 'Pass',
    host: 'Host',
    past: 'Past',
    readOnly: 'Read-Only',
    ptsReward: 'pts',
    hostedBy: 'Hosted by',
    spotsFilled: 'spots filled',
    viewDetails: 'View Details',
    shareEvent: 'Share event',
    eventLinkCopied: '✓ Event link copied to clipboard!',
    ageRange: 'Age Range',
    location: 'Location',
    dateTime: 'Date & Time',
    attendees: 'Attendees',
    spotsRemaining: 'spots remaining',
    attendingToast: "You're attending this event! Added to your schedule.",
    maybeToast: "Marked as maybe. Added to your calendar.",
    passedToast: 'Passed on event.',

    // Calendar Page
    calendarTitle: 'Calendar & Schedule',
    calendarSubtitle: 'Track your upcoming RSVPs, community meetups, and hostings',
    upcomingPlans: 'Upcoming Plans',
    pastGatherings: 'Past Gatherings',
    noPlansOnDate: 'No plans on this date',
    selectDatePrompt: 'Select a highlighted date on the calendar to view scheduled gatherings.',
    today: 'Today',

    // Saved Page
    savedTitle: 'Saved Gatherings & Bookmarks',
    savedSubtitle: "Keep track of events and circles you've saved for later",
    savedPlans: 'Saved Plans',
    noSavedEvents: 'No saved gatherings yet. Bookmark events from Discover or Social to see them here.',

    // Plans Page & Management
    createPlan: 'Create Plan',
    myPlans: 'My Plans',
    postPlan: 'Post Plan',
    postGathering: 'Post a Gathering',
    editPlan: 'Edit Plan',
    deleteEvent: 'Delete Event',
    confirmDeleteTitle: 'Delete Plan Confirmation',
    confirmDeleteMessage: 'Are you sure you want to delete this plan? This action cannot be undone.',
    cancel: 'Cancel',
    confirmDelete: 'Delete Plan',
    planTitleLabel: 'Plan Title',
    planTitlePlaceholder: 'e.g. Saturday Morning Trail Run',
    planDescriptionLabel: 'Description',
    planDescriptionPlaceholder: 'Describe your plan, what to bring, and expectations...',
    planLocationLabel: 'Location / Venue',
    planLocationPlaceholder: 'e.g. Kitsilano Beach, Vancouver, BC',
    planDateLabel: 'Date',
    planTimeLabel: 'Time',
    planVisibilityLabel: 'Visibility',
    planHobbiesLabel: 'Categories & Hobbies',
    planAgeRangeLabel: 'Age Range',
    planPointsLabel: 'Reward Points',
    planSubmitButton: 'Publish Plan',
    planSaveSuccess: 'Plan saved successfully!',
    noPlansCreatedYet: 'You have not hosted any plans yet. Click "Create Plan" to organize your first meetup!',

    // Social & Circles
    socialTitle: 'Social & Circles',
    socialSubtitle: 'Connect with local members, explore interest circles, and nurture genuine friendships',
    meetTab: 'Meet People',
    circlesTab: 'Circles',
    connectionsTab: 'Connections',
    recommendedMembers: 'Recommended Members Near You',
    createCircle: 'Create Circle',
    joinCircle: 'Join Circle',
    leaveCircle: 'Leave Circle',
    member: 'member',
    members: 'members',
    sendMessage: 'Send Message',
    connect: 'Connect',
    connected: 'Connected',
    pending: 'Pending',
    matchScore: 'match',
    sharedHobbies: 'shared passions',
    noMembersFound: 'No nearby members found matching your current filters.',
    noCirclesFound: 'No circles found. Create your own circle to bring members together!',
    noConnectionsFound: 'You have no active connections yet. Explore "Meet People" to send match requests.',

    // Profile Settings
    profileSettings: 'Profile & Account Settings',
    bioLabel: 'Bio / About Me',
    bioPlaceholder: 'Tell the community about yourself...',
    dobLabel: 'Date of Birth',
    neighbourhoodLabel: 'Neighbourhood',
    cityLabel: 'City',
    hobbiesLabel: 'My Hobbies & Passions',
    saveChanges: 'Save Changes',
    inviteCodeLabel: 'My Exclusive Invitation Code',
    copyCode: 'Copy Code',
    codeCopied: '✓ Invite code copied to clipboard!',

    // Auth / Login Page
    brandTagline: 'trusted circles & warm community spaces',
    signInTab: 'Sign In',
    registerTab: 'Register with Invite',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter username',
    emailLabel: 'Email',
    emailPlaceholder: 'name@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    passwordsMismatch: 'Passwords do not match.',
    passwordsMatch: 'Passwords match.',
    inviteCodePlaceholder: 'Enter 6-character code (e.g. A8X9K2)',
    locationPlaceholder: 'Search address or neighbourhood (e.g. Kitsilano, Vancouver)',
    signInButton: 'Sign In',
    registerButton: 'Continue to Profile Setup (Step 1 of 2) →',
    processing: 'Processing...',
    termsDisclaimer: 'By continuing, you agree to our',
    termsCheckboxLabel: 'I accept the Terms and Conditions',
    termsCheckboxRequired: 'You must accept the Terms and Conditions to create an account.',
    settingUpSession: 'Setting up your Havens session...',
    authErrorMissingFields: 'Please fill in all required fields including your 6-character invitation code.',
    authErrorInvalidCreds: 'Authentication failed: Invalid credentials.',
    authSuccessRedirect: 'Account created! A welcome email is on its way. Proceeding to Profile Setup...',

    // Terms and Conditions Page (Exact 6 Sections)
    termsBadge: 'Legal & Community Standards',
    termsTitle: 'Havens: Terms and Conditions',
    termsLastUpdated: 'Last Updated: August 2026',
    termsIntro: 'Welcome to Havens. By accessing or using our platform, you agree to be bound by these Terms and Conditions. Please read them carefully.',
    termsSec1Title: '1. Acceptance of Terms and Right of Admission',
    termsSec1Body: 'Havens operates as a private, invite-only community platform. Access to our services is a privilege, not a right. We reserve the absolute right to revoke access, disable invite codes, or terminate any user account at our sole discretion, at any time, and without prior notice, especially in cases of community guideline violations.',
    termsSec2Title: '2. User-Generated Content (Safe Harbor)',
    termsSec2Intro: 'Users may upload profile photos, event descriptions, and other digital content. Havens acts strictly as a hosting platform and claims safe harbor protections regarding user-generated content.',
    termsSec2Item1: 'We do not endorse or take responsibility for any content posted by users.',
    termsSec2Item2: 'You agree not to upload illegal, offensive, or copyrighted material.',
    termsSec2Item3: 'We reserve the right to remove any content or account that violates these terms without liability.',
    termsSec3Title: '3. Geolocation and Privacy',
    termsSec3Intro: 'To provide localized matchmaking and event discovery, Havens utilizes location data and distance-calculation algorithms (such as the Haversine formula).',
    termsSec3Item1: 'By using Havens, you consent to the collection and processing of your geographic coordinates strictly for core platform functionalities.',
    termsSec3Item2: 'Havens is committed to your privacy: your exact location data is never sold to third-party data brokers or marketing agencies.',
    termsSec4Title: '4. Real-World Meetups and Hold Harmless Agreement',
    termsSec4Intro: 'Havens is a digital utility designed to facilitate in-person connections and small group events.',
    termsSec4Item1: 'Havens does not conduct criminal background checks on its users.',
    termsSec4Item2: 'You acknowledge that interacting with other members and attending physical meetups carries inherent risks.',
    termsSec4Item3: 'Waiver of Liability: By using this platform, you agree to hold Havens, its founders, and affiliates harmless from any claims, damages, injuries, or losses arising from real-world interactions, meetups, or events coordinated through the application. You assume full personal responsibility for your safety.',
    termsSec5Title: '5. Subscriptions and Payments',
    termsSec5Intro: 'Certain features or organizer tools within Havens may require payment via third-party processors (e.g., Stripe or PayPal).',
    termsSec5Item1: 'All subscription charges are billed in advance on a recurring basis.',
    termsSec5Item2: 'Users are responsible for managing their auto-renewal settings.',
    termsSec5Item3: 'All sales are final. Refunds will only be issued at the sole discretion of Havens management or as required by applicable law.',
    termsSec6Title: '6. Modifications to the Service',
    termsSec6Body: 'We reserve the right to modify or discontinue any part of the Havens platform at any time without prior liability to you.',
  },

  es: {
    // Navigation & General
    discover: 'Descubrir',
    social: 'Social',
    calendar: 'Calendario',
    saved: 'Guardados',
    plans: 'Planes',
    messages: 'Mensajes',
    profile: 'Perfil',
    signOut: 'Cerrar sesión',
    back: '← Volver',
    language: 'Idioma',

    // Footer & Branding
    footerTagline: 'Vínculos genuinos a través de pasiones compartidas',
    termsAndConditions: 'Términos y Condiciones',
    allRightsReserved: 'Todos los derechos reservados.',

    // Discover Page
    discoverTitle: 'Descubre planes comunitarios',
    discoverSubtitle: 'Explora encuentros locales a través de tarjetas de descubrimiento o mapa interactivo',
    discoverFeed: 'Feed de Descubrimiento',
    interactiveMap: 'Mapa Interactivo',
    activePlansBanner: 'plan(es) activo(s) (marcado como Asistiré/Quizás). Estos se archivan de tu feed y permanecen activos en tu Mapa y Calendario.',
    viewOnMap: 'Ver en Mapa',
    fetchingEvents: 'Cargando eventos en vivo desde el servidor...',
    failedLoadEvents: 'Error al cargar eventos comunitarios. Por favor intenta de nuevo.',
    noMoreEvents: 'No hay más eventos en tu área por ahora',
    noMoreEventsSub: 'Vuelve pronto o amplía tu búsqueda en Social y Círculos.',
    refreshFeed: 'Actualizar Feed de Descubrimiento',

    // Swipe & Map & Card Actions
    going: 'Asistiré',
    confirm: 'Confirmar',
    maybe: 'Quizás',
    pass: 'Pasar',
    host: 'Anfitrión',
    past: 'Pasado',
    readOnly: 'Solo lectura',
    ptsReward: 'pts',
    hostedBy: 'Organizado por',
    spotsFilled: 'cupos ocupados',
    viewDetails: 'Ver Detalles',
    shareEvent: 'Compartir evento',
    eventLinkCopied: '✓ ¡Enlace copiado al portapapeles!',
    ageRange: 'Rango de Edad',
    location: 'Ubicación',
    dateTime: 'Fecha y Hora',
    attendees: 'Asistentes',
    spotsRemaining: 'cupos disponibles',
    attendingToast: '¡Asistirás a este evento! Agregado a tu agenda.',
    maybeToast: 'Marcado como quizás. Agregado a tu calendario.',
    passedToast: 'Has pasado este evento.',

    // Calendar Page
    calendarTitle: 'Calendario y Agenda',
    calendarSubtitle: 'Sigue tus confirmaciones de asistencia, encuentros comunitarios y eventos creados',
    upcomingPlans: 'Próximos Planes',
    pastGatherings: 'Encuentros Pasados',
    noPlansOnDate: 'No hay planes para esta fecha',
    selectDatePrompt: 'Selecciona una fecha resaltada en el calendario para ver los encuentros programados.',
    today: 'Hoy',

    // Saved Page
    savedTitle: 'Encuentros Guardados y Favoritos',
    savedSubtitle: 'Guarda los eventos y círculos que te interesan para más tarde',
    savedPlans: 'Planes Guardados',
    noSavedEvents: 'Aún no tienes encuentros guardados. Guarda eventos desde Descubrir o Social para verlos aquí.',

    // Plans Page & Management
    createPlan: 'Crear Plan',
    myPlans: 'Mis Planes',
    postPlan: 'Publicar Plan',
    postGathering: 'Publicar un Encuentro',
    editPlan: 'Editar Plan',
    deleteEvent: 'Eliminar Plan',
    confirmDeleteTitle: 'Confirmar Eliminación',
    confirmDeleteMessage: '¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.',
    cancel: 'Cancelar',
    confirmDelete: 'Eliminar Plan',
    planTitleLabel: 'Título del Plan',
    planTitlePlaceholder: 'ej. Caminata por el sendero el sábado por la mañana',
    planDescriptionLabel: 'Descripción',
    planDescriptionPlaceholder: 'Describe tu plan, qué llevar y las expectativas...',
    planLocationLabel: 'Ubicación / Lugar',
    planLocationPlaceholder: 'ej. Parque de la 93, Bogotá',
    planDateLabel: 'Fecha',
    planTimeLabel: 'Hora',
    planVisibilityLabel: 'Visibilidad',
    planHobbiesLabel: 'Categorías e Intereses',
    planAgeRangeLabel: 'Rango de Edad',
    planPointsLabel: 'Puntos de Recompensa',
    planSubmitButton: 'Publicar Plan',
    planSaveSuccess: '¡Plan guardado exitosamente!',
    noPlansCreatedYet: 'Aún no has organizado ningún plan. ¡Haz clic en "Crear Plan" para organizar tu primer encuentro!',

    // Social & Circles
    socialTitle: 'Social y Círculos',
    socialSubtitle: 'Conecta con miembros locales, explora círculos de interés y cultiva amistades genuinas',
    meetTab: 'Conocer Personas',
    circlesTab: 'Círculos',
    connectionsTab: 'Conexiones',
    recommendedMembers: 'Miembros Recomendados Cerca de Ti',
    createCircle: 'Crear Círculo',
    joinCircle: 'Unirse al Círculo',
    leaveCircle: 'Salir del Círculo',
    member: 'miembro',
    members: 'miembros',
    sendMessage: 'Enviar Mensaje',
    connect: 'Conectar',
    connected: 'Conectado',
    pending: 'Pendiente',
    matchScore: 'afinidad',
    sharedHobbies: 'pasiones compartidas',
    noMembersFound: 'No se encontraron miembros cercanos con tus filtros actuales.',
    noCirclesFound: 'No se encontraron círculos. ¡Crea tu propio círculo para reunir a la comunidad!',
    noConnectionsFound: 'Aún no tienes conexiones activas. Explora "Conocer Personas" para enviar solicitudes de conexión.',

    // Profile Settings
    profileSettings: 'Configuración de Perfil y Cuenta',
    bioLabel: 'Biografía / Sobre Mí',
    bioPlaceholder: 'Cuéntale a la comunidad sobre ti...',
    dobLabel: 'Fecha de Nacimiento',
    neighbourhoodLabel: 'Barrio / Vecindario',
    cityLabel: 'Ciudad',
    hobbiesLabel: 'Mis Pasiones e Intereses',
    saveChanges: 'Guardar Cambios',
    inviteCodeLabel: 'Mi Código Exclusivo de Invitación',
    copyCode: 'Copiar Código',
    codeCopied: '✓ ¡Código copiado al portapapeles!',

    // Auth / Login Page
    brandTagline: 'círculos de confianza y espacios comunitarios cálidos',
    signInTab: 'Iniciar Sesión',
    registerTab: 'Registrarse con Invitación',
    usernameLabel: 'Nombre de usuario',
    usernamePlaceholder: 'Ingresa tu usuario',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'nombre@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    confirmPasswordLabel: 'Confirmar Contraseña',
    confirmPasswordPlaceholder: 'Vuelve a ingresar tu contraseña',
    passwordsMismatch: 'Las contraseñas no coinciden.',
    passwordsMatch: 'Las contraseñas coinciden.',
    inviteCodePlaceholder: 'Código de 6 caracteres (ej. A8X9K2)',
    locationPlaceholder: 'Buscar dirección o vecindario (ej. Kitsilano, Vancouver)',
    signInButton: 'Iniciar Sesión',
    registerButton: 'Continuar a Configuración de Perfil (Paso 1 de 2) →',
    processing: 'Procesando...',
    termsDisclaimer: 'Al continuar, aceptas nuestros',
    termsCheckboxLabel: 'Acepto los Términos y Condiciones',
    termsCheckboxRequired: 'Debes aceptar los Términos y Condiciones para crear una cuenta.',
    settingUpSession: 'Configurando tu sesión de Havens...',
    authErrorMissingFields: 'Por favor completa todos los campos requeridos incluyendo tu código de invitación de 6 caracteres.',
    authErrorInvalidCreds: 'Error de autenticación: Credenciales inválidas.',
    authSuccessRedirect: '¡Cuenta creada! Se ha enviado un correo de bienvenida. Continuando a Configuración de Perfil...',

    // Terms and Conditions Page (Exact 6 Sections)
    termsBadge: 'Estándares Legales y de la Comunidad',
    termsTitle: 'Havens: Términos y Condiciones',
    termsLastUpdated: 'Última actualización: Agosto 2026',
    termsIntro: 'Bienvenido a Havens. Al acceder o utilizar nuestra plataforma, aceptas quedar vinculado por estos Términos y Condiciones. Por favor léelos atentamente.',
    termsSec1Title: '1. Aceptación de los Términos y Derecho de Admisión',
    termsSec1Body: 'Havens opera como una plataforma comunitaria privada y de solo invitación. El acceso a nuestros servicios es un privilegio, no un derecho. Nos reservamos el derecho absoluto de revocar el acceso, deshabilitar códigos de invitación o cancelar cualquier cuenta de usuario a nuestra entera discreción, en cualquier momento y sin previo aviso, especialmente en casos de violaciones de las normas comunitarias.',
    termsSec2Title: '2. Contenido Generado por el Usuario (Safe Harbor)',
    termsSec2Intro: 'Los usuarios pueden subir fotos de perfil, descripciones de eventos y otro contenido digital. Havens actúa estrictamente como plataforma de alojamiento y reclama protecciones de puerto seguro (Safe Harbor) con respecto al contenido generado por el usuario.',
    termsSec2Item1: 'No respaldamos ni asumimos responsabilidad por ningún contenido publicado por los usuarios.',
    termsSec2Item2: 'Aceptas no subir material ilegal, ofensivo o protegido por derechos de autor.',
    termsSec2Item3: 'Nos reservamos el derecho de eliminar cualquier contenido o cuenta que viole estos términos sin responsabilidad alguna.',
    termsSec3Title: '3. Geolocalización y Privacidad',
    termsSec3Intro: 'Para proporcionar emparejamiento localizado y descubrimiento de eventos, Havens utiliza datos de ubicación y algoritmos de cálculo de distancia (como la fórmula de Haversine).',
    termsSec3Item1: 'Al usar Havens, aceptas la recopilación y procesamiento de tus coordenadas geográficas estrictamente para las funcionalidades esenciales de la plataforma.',
    termsSec3Item2: 'Havens está comprometido con tu privacidad: tus datos de ubicación exacta nunca se venden a intermediarios de datos externos ni a agencias de marketing.',
    termsSec4Title: '4. Encuentros en el Mundo Real y Acuerdo de Exención de Responsabilidad',
    termsSec4Intro: 'Havens es una utilidad digital diseñada para facilitar conexiones en persona y eventos en grupos pequeños.',
    termsSec4Item1: 'Havens no realiza verificaciones de antecedentes penales de sus usuarios.',
    termsSec4Item2: 'Reconoces que interactuar con otros miembros y asistir a encuentros físicos conlleva riesgos inherentes.',
    termsSec4Item3: 'Exención de Responsabilidad: Al usar esta plataforma, aceptas mantener a Havens, a sus fundadores y afiliados libres de toda responsabilidad por reclamos, daños, lesiones o pérdidas que surjan de interacciones en el mundo real, encuentros o eventos coordinados a través de la aplicación. Asumes total responsabilidad personal por tu seguridad.',
    termsSec5Title: '5. Suscripciones y Pagos',
    termsSec5Intro: 'Ciertas funciones o herramientas para organizadores en Havens pueden requerir pagos a través de procesadores de terceros (ej., Stripe o PayPal).',
    termsSec5Item1: 'Todos los cargos por suscripción se facturan por adelantado de forma recurrente.',
    termsSec5Item2: 'Los usuarios son responsables de administrar su configuración de renovación automática.',
    termsSec5Item3: 'Todas las ventas son finales. Los reembolsos solo se emitirán a discreción exclusiva de la administración de Havens o según lo exija la ley aplicable.',
    termsSec6Title: '6. Modificaciones al Servicio',
    termsSec6Body: 'Nos reservamos el derecho de modificar o discontinuar cualquier parte de la plataforma Havens en cualquier momento sin responsabilidad previa hacia ti.',
  },

  fr: {
    // Navigation & General
    discover: 'Découvrir',
    social: 'Social',
    calendar: 'Calendrier',
    saved: 'Enregistrés',
    plans: 'Plans',
    messages: 'Messages',
    profile: 'Profil',
    signOut: 'Se déconnecter',
    back: '← Retour',
    language: 'Langue',

    // Footer & Branding
    footerTagline: 'Des liens authentiques à travers des passions partagées',
    termsAndConditions: 'Conditions Générales',
    allRightsReserved: 'Tous droits réservés.',

    // Discover Page
    discoverTitle: 'Découvrez les rassemblements communautaires',
    discoverSubtitle: 'Explorez les événements locaux via des cartes de découverte ou la carte interactive',
    discoverFeed: 'Fil de Découverte',
    interactiveMap: 'Carte Interactive',
    activePlansBanner: 'plan(s) actif(s) (marqué Participe/Peut-être). Ils sont archivés de votre fil et maintenus en direct sur votre Carte et Calendrier.',
    viewOnMap: 'Voir sur la Carte',
    fetchingEvents: 'Chargement des événements en direct depuis le serveur...',
    failedLoadEvents: 'Échec du chargement des événements. Veuillez réessayer.',
    noMoreEvents: "Plus d'événements dans votre secteur pour l'instant",
    noMoreEventsSub: 'Revenez bientôt ou élargissez votre recherche dans Social et Cercles.',
    refreshFeed: 'Actualiser le Fil de Découverte',

    // Swipe & Map & Card Actions
    going: 'Participe',
    confirm: 'Confirmer',
    maybe: 'Peut-être',
    pass: 'Passer',
    host: 'Hôte',
    past: 'Passé',
    readOnly: 'Lecture seule',
    ptsReward: 'pts',
    hostedBy: 'Organisé par',
    spotsFilled: 'places réservées',
    viewDetails: 'Voir les Détails',
    shareEvent: "Partager l'événement",
    eventLinkCopied: '✓ Lien copié dans le presse-papiers !',
    ageRange: "Tranche d'Âge",
    location: 'Emplacement',
    dateTime: 'Date et Heure',
    attendees: 'Participants',
    spotsRemaining: 'places restantes',
    attendingToast: 'Vous participez à cet événement ! Ajouté à votre agenda.',
    maybeToast: 'Marqué comme peut-être. Ajouté à votre calendrier.',
    passedToast: 'Événement passé.',

    // Calendar Page
    calendarTitle: 'Calendrier et Agenda',
    calendarSubtitle: 'Suivez vos participations, rencontres communautaires et événements organisés',
    upcomingPlans: 'Plans à Venir',
    pastGatherings: 'Rassemblements Passés',
    noPlansOnDate: 'Aucun plan à cette date',
    selectDatePrompt: 'Sélectionnez une date mise en surbrillance sur le calendrier pour voir les rassemblements.',
    today: "Aujourd'hui",

    // Saved Page
    savedTitle: 'Rassemblements Enregistrés et Favoris',
    savedSubtitle: 'Conservez les événements et cercles qui vous intéressent pour plus tard',
    savedPlans: 'Plans Enregistrés',
    noSavedEvents: 'Aucun événement enregistré pour le moment. Enregistrez des événements depuis Découvrir ou Social.',

    // Plans Page & Management
    createPlan: 'Créer un Plan',
    myPlans: 'Mes Plans',
    postPlan: 'Publier le Plan',
    postGathering: 'Organiser un Rassemblement',
    editPlan: 'Modifier le Plan',
    deleteEvent: 'Supprimer le Plan',
    confirmDeleteTitle: 'Confirmation de Suppression',
    confirmDeleteMessage: 'Êtes-vous sûr de vouloir supprimer ce plan ? Cette action ne peut pas être annulée.',
    cancel: 'Annuler',
    confirmDelete: 'Supprimer le Plan',
    planTitleLabel: 'Titre du Plan',
    planTitlePlaceholder: 'ex. Randonnée matinale du samedi',
    planDescriptionLabel: 'Description',
    planDescriptionPlaceholder: 'Décrivez votre plan, le matériel nécessaire et les attentes...',
    planLocationLabel: 'Emplacement / Lieu',
    planLocationPlaceholder: 'ex. Parc Lafontaine, Montréal',
    planDateLabel: 'Date',
    planTimeLabel: 'Heure',
    planVisibilityLabel: 'Visibilité',
    planHobbiesLabel: 'Catégories et Passions',
    planAgeRangeLabel: "Tranche d'Âge",
    planPointsLabel: 'Points de Récompense',
    planSubmitButton: 'Publier le Plan',
    planSaveSuccess: 'Plan enregistré avec succès !',
    noPlansCreatedYet: "Vous n'avez pas encore organisé de plan. Cliquez sur \"Créer un Plan\" pour organiser votre première rencontre !",

    // Social & Circles
    socialTitle: 'Social et Cercles',
    socialSubtitle: 'Connectez-vous avec des membres locaux, explorez des cercles et cultivez de vraies amitiés',
    meetTab: 'Rencontrer des Gens',
    circlesTab: 'Cercles',
    connectionsTab: 'Connexions',
    recommendedMembers: 'Membres Recommandés Près de Vous',
    createCircle: 'Créer un Cercle',
    joinCircle: 'Rejoindre le Cercle',
    leaveCircle: 'Quitter le Cercle',
    member: 'membre',
    members: 'membres',
    sendMessage: 'Envoyer un Message',
    connect: 'Se Connecter',
    connected: 'Connecté',
    pending: 'En attente',
    matchScore: 'affinité',
    sharedHobbies: 'passions partagées',
    noMembersFound: 'Aucun membre correspondant trouvé avec vos filtres actuels.',
    noCirclesFound: 'Aucun cercle trouvé. Créez votre propre cercle pour rassembler la communauté !',
    noConnectionsFound: "Vous n'avez pas encore de connexion active. Explorez \"Rencontrer des Gens\" pour envoyer des demandes.",

    // Profile Settings
    profileSettings: 'Paramètres du Profil et du Compte',
    bioLabel: 'Biographie / À Propos',
    bioPlaceholder: 'Parlez de vous à la communauté...',
    dobLabel: 'Date de Naissance',
    neighbourhoodLabel: 'Quartier',
    cityLabel: 'Ville',
    hobbiesLabel: 'Mes Passions et Intérêts',
    saveChanges: 'Enregistrer les Modifications',
    inviteCodeLabel: "Mon Code d'Invitation Exclusif",
    copyCode: 'Copier le Code',
    codeCopied: '✓ Code copié dans le presse-papiers !',

    // Auth / Login Page
    brandTagline: 'cercles de confiance et espaces communautaires chaleureux',
    signInTab: 'Se Connecter',
    registerTab: "S'inscrire avec Invitation",
    usernameLabel: "Nom d'utilisateur",
    usernamePlaceholder: "Entrez votre nom d'utilisateur",
    emailLabel: 'Adresse E-mail',
    emailPlaceholder: 'nom@exemple.com',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Entrez votre mot de passe',
    confirmPasswordLabel: 'Confirmer le mot de passe',
    confirmPasswordPlaceholder: 'Retapez votre mot de passe',
    passwordsMismatch: 'Les mots de passe ne correspondent pas.',
    passwordsMatch: 'Les mots de passe correspondent.',
    inviteCodePlaceholder: 'Code à 6 caractères (ex. A8X9K2)',
    locationPlaceholder: 'Rechercher adresse ou quartier (ex. Kitsilano, Vancouver)',
    signInButton: 'Se Connecter',
    registerButton: 'Continuer vers le Profil (Étape 1 sur 2) →',
    processing: 'Traitement en cours...',
    termsDisclaimer: 'En continuant, vous acceptez nos',
    termsCheckboxLabel: "J'accepte les Conditions Générales",
    termsCheckboxRequired: 'Vous devez accepter les Conditions Générales pour créer un compte.',
    settingUpSession: 'Configuration de votre session Havens...',
    authErrorMissingFields: "Veuillez remplir tous les champs obligatoires, y compris votre code d'invitation à 6 caractères.",
    authErrorInvalidCreds: "Échec de l'authentification : Identifiants invalides.",
    authSuccessRedirect: 'Compte créé ! Un e-mail de bienvenue vous a été envoyé. Poursuite de la configuration...',

    // Terms and Conditions Page (Exact 6 Sections)
    termsBadge: 'Normes Juridiques et Communautaires',
    termsTitle: "Havens : Conditions Générales d'Utilisation",
    termsLastUpdated: 'Dernière mise à jour : Août 2026',
    termsIntro: 'Bienvenue sur Havens. En accédant ou en utilisant notre plateforme, vous acceptez d\'être lié par les présentes Conditions Générales. Veuillez les lire attentivement.',
    termsSec1Title: '1. Acceptation des Conditions et Droit d\'Admission',
    termsSec1Body: 'Havens fonctionne comme une plateforme communautaire privée, accessible uniquement sur invitation. L\'accès à nos services est un privilège et non un droit. Nous nous réservons le droit absolu de révoquer l\'accès, de désactiver les codes d\'invitation ou de résilier tout compte d\'utilisateur à notre entière discrétion, à tout moment et sans préavis, en particulier en cas de violation des règles de la communauté.',
    termsSec2Title: '2. Contenu Généré par les Utilisateurs (Safe Harbor)',
    termsSec2Intro: 'Les utilisateurs peuvent télécharger des photos de profil, des descriptions d\'événements et d\'autres contenus numériques. Havens agit strictement en tant que plateforme d\'hébergement et revendique les protections de la sphère de sécurité (Safe Harbor) concernant le contenu généré par les utilisateurs.',
    termsSec2Item1: 'Nous n\'approuvons ni n\'assumons aucune responsabilité quant au contenu publié par les utilisateurs.',
    termsSec2Item2: 'Vous acceptez de ne pas télécharger de contenu illégal, offensant ou protégé par le droit d\'auteur.',
    termsSec2Item3: 'Nous nous réservons le droit de supprimer tout contenu ou compte enfreignant ces conditions, sans engager notre responsabilité.',
    termsSec3Title: '3. Géolocalisation et Confidentialité',
    termsSec3Intro: 'Afin de proposer des correspondances et des découvertes d\'événements localisés, Havens utilise des données de localisation et des algorithmes de calcul de distance (tels que la formule de Haversine).',
    termsSec3Item1: 'En utilisant Havens, vous consentez à la collecte et au traitement de vos coordonnées géographiques strictement pour les fonctionnalités essentielles de la plateforme.',
    termsSec3Item2: 'Havens s\'engage pour votre confidentialité : vos données de localisation exacte ne sont jamais vendues à des courtiers de données tiers ou à des agences de marketing.',
    termsSec4Title: '4. Rencontres dans le Monde Réel et Accord de Dégagement de Responsabilité',
    termsSec4Intro: 'Havens est un outil numérique conçu pour faciliter les rencontres en personne et les événements en petits groupes.',
    termsSec4Item1: 'Havens n\'effectue pas de vérification des antécédents criminels de ses utilisateurs.',
    termsSec4Item2: 'Vous reconnaissez qu\'interagir avec d\'autres membres et participer à des rencontres physiques comporte des risques inhérents.',
    termsSec4Item3: 'Exonération de responsabilité : En utilisant cette plateforme, vous acceptez de dégager Havens, ses fondateurs et ses affiliés de toute réclamation, dommage, blessure ou perte résultant d\'interactions dans le monde réel, de rencontres ou d\'événements coordonnés via l\'application. Vous assumez l\'entière responsabilité personnelle de votre sécurité.',
    termsSec5Title: '5. Abonnements et Paiements',
    termsSec5Intro: 'Certaines fonctionnalités ou outils d\'organisateur sur Havens peuvent nécessiter un paiement via des processeurs tiers (par exemple Stripe ou PayPal).',
    termsSec5Item1: 'Tous les frais d\'abonnement sont facturés à l\'avance sur une base récurrente.',
    termsSec5Item2: 'Les utilisateurs sont responsables de la gestion de leurs paramètres de renouvellement automatique.',
    termsSec5Item3: 'Toutes les ventes sont définitives. Les remboursements ne seront effectués qu\'à la seule discrétion de la direction de Havens ou conformément aux lois applicables.',
    termsSec6Title: '6. Modifications du Service',
    termsSec6Body: 'Nous nous réservons le droit de modifier ou d\'interrompre toute partie de la plateforme Havens à tout moment, sans responsabilité préalable envers vous.',
  },
};
