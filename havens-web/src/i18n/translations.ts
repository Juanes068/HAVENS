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
  inviteCodeLabel: string;
  inviteCodePlaceholder: string;
  locationLabel: string;
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

  // Section 1
  termsSec1Title: string;
  termsSec1Body: string;

  // Section 2
  termsSec2Title: string;
  termsSec2Intro: string;
  termsSec2Item1: string;
  termsSec2Item2: string;
  termsSec2Item3: string;

  // Section 3
  termsSec3Title: string;
  termsSec3Intro: string;
  termsSec3Item1: string;
  termsSec3Item2: string;

  // Section 4
  termsSec4Title: string;
  termsSec4Intro: string;
  termsSec4Item1: string;
  termsSec4Item2: string;
  termsSec4Item3: string;

  // Section 5
  termsSec5Title: string;
  termsSec5Intro: string;
  termsSec5Item1: string;
  termsSec5Item2: string;
  termsSec5Item3: string;

  // Section 6
  termsSec6Title: string;
  termsSec6Body: string;

  // Plans & Misc
  createPlan: string;
  myPlans: string;
  deleteEvent: string;
  postPlan: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  cancel: string;
  confirmDelete: string;
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
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

    footerTagline: 'Genuine bonds through shared passions',
    termsAndConditions: 'Terms & Conditions',
    allRightsReserved: 'All rights reserved.',

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
    inviteCodeLabel: 'Invitation Code',
    inviteCodePlaceholder: 'Enter 6-character code (e.g. A8X9K2)',
    locationLabel: 'Location / Neighbourhood',
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
    back: '← Volver',
    language: 'Idioma',

    footerTagline: 'Vínculos genuinos a través de pasiones compartidas',
    termsAndConditions: 'Términos y Condiciones',
    allRightsReserved: 'Todos los derechos reservados.',

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
    inviteCodeLabel: 'Código de Invitación',
    inviteCodePlaceholder: 'Código de 6 caracteres (ej. A8X9K2)',
    locationLabel: 'Ubicación / Barrio',
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
    back: '← Retour',
    language: 'Langue',

    footerTagline: 'Des liens authentiques à travers des passions partagées',
    termsAndConditions: 'Conditions Générales',
    allRightsReserved: 'Tous droits réservés.',

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
    inviteCodeLabel: "Code d'invitation",
    inviteCodePlaceholder: 'Code à 6 caractères (ex. A8X9K2)',
    locationLabel: 'Emplacement / Quartier',
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

    createPlan: 'Créer un Plan',
    myPlans: 'Mes Plans',
    deleteEvent: 'Supprimer le Plan',
    postPlan: 'Publier le Plan',
    confirmDeleteTitle: 'Confirmation de Suppression',
    confirmDeleteMessage: 'Êtes-vous sûr de vouloir supprimer ce plan ? Cette action ne peut pas être annulée.',
    cancel: 'Annuler',
    confirmDelete: 'Supprimer le Plan',
  },
};
