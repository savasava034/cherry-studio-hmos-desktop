import i18n from 'i18next'
// If the project uses react-i18next, keep the import. Otherwise this file is idempotent and safe to adapt.
let hasReact = false
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require.resolve('react-i18next')
    hasReact = true
} catch (e) {
    hasReact = false
}
if (hasReact) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initReactI18next } = require('react-i18next')
    i18n.use(initReactI18next)
}

// Load locales shipped with repository. Keep keys consistent with app usage (e.g. 'tr-TR' or 'tr').
// Adjust the path if your build system moves files; this file expects the JSON next to it under ./locales
const tr = require('./locales/tr-tr.json')

const resources: any = {
    'tr-TR': { translation: tr }
}

if (!i18n.isInitialized) {
    i18n.init({
        resources,
        lng: 'en', // keep default language as English; users can switch to tr-TR in app settings
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        debug: false
    })
} else {
    if (!i18n.hasResourceBundle('tr-TR', 'translation')) {
        i18n.addResourceBundle('tr-TR', 'translation', tr, true, true)
    }
}

export default i18n
