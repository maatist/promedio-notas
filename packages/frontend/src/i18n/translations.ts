export const translations = {
  es: {
    app: {
      name: 'Promedio Notas',
    },
    auth: {
      login: 'Iniciar Sesion',
      register: 'Registrarse',
      username: 'Usuario',
      password: 'Contrasena',
      confirmPassword: 'Confirmar contrasena',
      loginTab: 'Ingresar',
      registerTab: 'Crear cuenta',
      welcome: 'Bienvenido',
      subtitle: 'Gestiona tus notas universitarias',
      noAccount: 'No tienes cuenta?',
      hasAccount: 'Ya tienes cuenta?',
      passwordMismatch: 'Las contrasenas no coinciden',
      errorInvalid: 'Usuario o contrasena incorrectos',
      errorGeneric: 'Error al procesar la solicitud',
      forgotPasswordLink: '¿Olvidaste tu contraseña?',
    },
    nav: {
      newSubject: 'Nueva Asignatura',
      selectPeriod: 'Seleccionar periodo',
      newPeriod: '+ Nuevo periodo',
      logout: 'Cerrar sesion',
      lightMode: 'Cambiar a modo claro',
      darkMode: 'Cambiar a modo oscuro',
    },
    dashboard: {
      noSubjects: 'No hay asignaturas en este periodo',
      addFirst: 'Agrega tu primera asignatura con el boton de arriba',
      noPeriods: 'Crea un periodo para comenzar',
      createPeriod: 'Crear Periodo',
      periodName: 'Nombre del periodo',
      periodPlaceholder: 'Ej: 2024-1',
    },
    subject: {
      composite: 'Compuesta',
      edit: 'Editar asignatura',
      delete: 'Eliminar asignatura',
      confirmDelete: 'Confirmar eliminacion',
      evaluation: 'Evaluacion',
      grade: 'Nota',
      weight: 'Peso',
      addGrade: 'Agregar nota',
      available: 'disponible',
      needForExemption: 'Necesitas un {grade} para eximirte',
      exemptionImpossible: 'No es posible eximirse',
      exemptionAchieved: 'Ya cumples para eximirte',
    },
    addSubject: {
      title: 'Nueva Asignatura',
      editTitle: 'Editar Asignatura',
      name: 'Nombre de la asignatura',
      namePlaceholder: 'Ej: Calculo I',
      compositeToggle: 'Asignatura compuesta (catedra + laboratorio + terreno)',
      components: 'Componentes',
      total: 'Total',
      componentName: 'Nombre',
      addComponent: 'Agregar componente',
      cancel: 'Cancelar',
      create: 'Crear Asignatura',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      errorName: 'El nombre es requerido',
      errorMinComponents: 'Una asignatura compuesta necesita al menos 2 componentes',
      errorComponentNames: 'Todos los componentes necesitan un nombre',
      errorWeightSum: 'Los porcentajes deben sumar 100%',
      errorSave: 'Error al guardar la asignatura',
      exemptionGrade: 'Nota de eximición',
    },
    grade: {
      namePlaceholder: 'Nombre (ej: Solemne 1)',
      valuePlaceholder: 'Nota (1-7)',
      weightPlaceholder: 'max',
      save: 'Guardar',
      cancel: 'Cancelar',
      deleteConfirm: 'Click de nuevo para confirmar',
      deleteGrade: 'Eliminar nota',
    },
    toast: {
      subjectCreated: 'Asignatura creada',
      subjectUpdated: 'Asignatura actualizada',
      subjectDeleted: 'Asignatura eliminada',
      gradeCreated: 'Nota agregada',
      gradeUpdated: 'Nota actualizada',
      gradeDeleted: 'Nota eliminada',
      periodCreated: 'Periodo creado',
      error: 'Ocurrio un error',
    },
    profile: {
      title: 'Perfil',
      email: 'Correo electrónico',
      emailPlaceholder: 'tu@email.com',
      save: 'Guardar',
      emailUpdated: 'Correo actualizado',
      emailConflict: 'Este correo ya está en uso',
    },
    forgotPassword: {
      title: 'Recuperar contraseña',
      description: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña',
      submit: 'Enviar enlace',
      success: 'Si existe una cuenta con ese correo, recibirás un enlace de recuperación',
      backToLogin: 'Volver al inicio de sesión',
    },
    resetPassword: {
      title: 'Restablecer contraseña',
      newPassword: 'Nueva contraseña',
      confirmPassword: 'Confirmar contraseña',
      submit: 'Restablecer',
      success: 'Contraseña restablecida correctamente',
      invalidToken: 'El enlace es inválido o ha expirado',
      mismatch: 'Las contraseñas no coinciden',
    },
    google: {
      signIn: 'Iniciar sesión con Google',
      error: 'Error al iniciar sesión con Google',
      orDivider: 'o',
    },
    emailPrompt: {
      title: 'Configura tu correo',
      description: 'Agrega un correo electrónico para poder recuperar tu contraseña en caso de olvidarla',
      skip: 'Ahora no',
      save: 'Guardar',
    },
  },
  en: {
    app: {
      name: 'Grade Average',
    },
    auth: {
      login: 'Log In',
      register: 'Sign Up',
      username: 'Username',
      password: 'Password',
      confirmPassword: 'Confirm password',
      loginTab: 'Log In',
      registerTab: 'Create Account',
      welcome: 'Welcome',
      subtitle: 'Manage your university grades',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      passwordMismatch: 'Passwords do not match',
      errorInvalid: 'Invalid username or password',
      errorGeneric: 'Error processing request',
      forgotPasswordLink: 'Forgot your password?',
    },
    nav: {
      newSubject: 'New Subject',
      selectPeriod: 'Select period',
      newPeriod: '+ New period',
      logout: 'Log out',
      lightMode: 'Switch to light mode',
      darkMode: 'Switch to dark mode',
    },
    dashboard: {
      noSubjects: 'No subjects in this period',
      addFirst: 'Add your first subject with the button above',
      noPeriods: 'Create a period to get started',
      createPeriod: 'Create Period',
      periodName: 'Period name',
      periodPlaceholder: 'E.g.: 2024-1',
    },
    subject: {
      composite: 'Composite',
      edit: 'Edit subject',
      delete: 'Delete subject',
      confirmDelete: 'Confirm deletion',
      evaluation: 'Evaluation',
      grade: 'Grade',
      weight: 'Weight',
      addGrade: 'Add grade',
      available: 'available',
      needForExemption: 'You need {grade} to be exempt',
      exemptionImpossible: 'Exemption not possible',
      exemptionAchieved: 'You already meet exemption',
    },
    addSubject: {
      title: 'New Subject',
      editTitle: 'Edit Subject',
      name: 'Subject name',
      namePlaceholder: 'E.g.: Calculus I',
      compositeToggle: 'Composite subject (lecture + lab + field)',
      components: 'Components',
      total: 'Total',
      componentName: 'Name',
      addComponent: 'Add component',
      cancel: 'Cancel',
      create: 'Create Subject',
      save: 'Save Changes',
      saving: 'Saving...',
      errorName: 'Name is required',
      errorMinComponents: 'A composite subject needs at least 2 components',
      errorComponentNames: 'All components need a name',
      errorWeightSum: 'Percentages must add up to 100%',
      errorSave: 'Error saving subject',
      exemptionGrade: 'Exemption grade',
    },
    grade: {
      namePlaceholder: 'Name (e.g.: Midterm 1)',
      valuePlaceholder: 'Grade (1-7)',
      weightPlaceholder: 'max',
      save: 'Save',
      cancel: 'Cancel',
      deleteConfirm: 'Click again to confirm',
      deleteGrade: 'Delete grade',
    },
    toast: {
      subjectCreated: 'Subject created',
      subjectUpdated: 'Subject updated',
      subjectDeleted: 'Subject deleted',
      gradeCreated: 'Grade added',
      gradeUpdated: 'Grade updated',
      gradeDeleted: 'Grade deleted',
      periodCreated: 'Period created',
      error: 'An error occurred',
    },
    profile: {
      title: 'Profile',
      email: 'Email',
      emailPlaceholder: 'you@email.com',
      save: 'Save',
      emailUpdated: 'Email updated',
      emailConflict: 'This email is already in use',
    },
    forgotPassword: {
      title: 'Forgot password',
      description: "Enter your email and we'll send you a link to reset your password",
      submit: 'Send link',
      success: "If an account with that email exists, you'll receive a recovery link",
      backToLogin: 'Back to login',
    },
    resetPassword: {
      title: 'Reset password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      submit: 'Reset',
      success: 'Password reset successfully',
      invalidToken: 'This link is invalid or has expired',
      mismatch: 'Passwords do not match',
    },
    google: {
      signIn: 'Sign in with Google',
      error: 'Error signing in with Google',
      orDivider: 'or',
    },
    emailPrompt: {
      title: 'Set up your email',
      description: 'Add an email address so you can recover your password if you forget it',
      skip: 'Not now',
      save: 'Save',
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKeys = {
  app: { name: string };
  auth: {
    login: string;
    register: string;
    username: string;
    password: string;
    confirmPassword: string;
    loginTab: string;
    registerTab: string;
    welcome: string;
    subtitle: string;
    noAccount: string;
    hasAccount: string;
    passwordMismatch: string;
    errorInvalid: string;
    errorGeneric: string;
    forgotPasswordLink: string;
  };
  nav: {
    newSubject: string;
    selectPeriod: string;
    newPeriod: string;
    logout: string;
    lightMode: string;
    darkMode: string;
  };
  dashboard: {
    noSubjects: string;
    addFirst: string;
    noPeriods: string;
    createPeriod: string;
    periodName: string;
    periodPlaceholder: string;
  };
  subject: {
    composite: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    evaluation: string;
    grade: string;
    weight: string;
    addGrade: string;
    available: string;
    needForExemption: string;
    exemptionImpossible: string;
    exemptionAchieved: string;
  };
  addSubject: {
    title: string;
    editTitle: string;
    name: string;
    namePlaceholder: string;
    compositeToggle: string;
    components: string;
    total: string;
    componentName: string;
    addComponent: string;
    cancel: string;
    create: string;
    save: string;
    saving: string;
    errorName: string;
    errorMinComponents: string;
    errorComponentNames: string;
    errorWeightSum: string;
    errorSave: string;
    exemptionGrade: string;
  };
  grade: {
    namePlaceholder: string;
    valuePlaceholder: string;
    weightPlaceholder: string;
    save: string;
    cancel: string;
    deleteConfirm: string;
    deleteGrade: string;
  };
  toast: {
    subjectCreated: string;
    subjectUpdated: string;
    subjectDeleted: string;
    gradeCreated: string;
    gradeUpdated: string;
    gradeDeleted: string;
    periodCreated: string;
    error: string;
  };
  profile: {
    title: string;
    email: string;
    emailPlaceholder: string;
    save: string;
    emailUpdated: string;
    emailConflict: string;
  };
  forgotPassword: {
    title: string;
    description: string;
    submit: string;
    success: string;
    backToLogin: string;
  };
  resetPassword: {
    title: string;
    newPassword: string;
    confirmPassword: string;
    submit: string;
    success: string;
    invalidToken: string;
    mismatch: string;
  };
  google: {
    signIn: string;
    error: string;
    orDivider: string;
  };
  emailPrompt: {
    title: string;
    description: string;
    skip: string;
    save: string;
  };
};
