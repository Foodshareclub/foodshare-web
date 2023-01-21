import {i18n} from '@lingui/core';
import {cs, en, fr, ru} from 'make-plural/plurals'

export const defaultLocale = "en";

i18n.loadLocaleData({
    en: {plurals: en},
    cs: {plurals: cs},
    ru: {plurals: ru},
    fr: {plurals: fr},
})

/**
 * We do a dynamic import of just the catalog that we need
 * @param locale any locale string
 */
export async function dynamicActivate(locale: string) {
    try {
        const {messages} = await import(`../../src/locales/${locale}/messages`)
        //console.log(messages)
        await i18n.load(locale, messages)
        await i18n.activate(locale)

    }catch (e) {
        console.log(e)
    }

}