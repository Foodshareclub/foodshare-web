import personalInfo from "@/assets/personal_info.png";
import userShield from "@/assets/user_shield.png";

type SettingsInfoArrayType = {
    img: string
    settingTitle: string
    description: string
    route: string
}

export const settingsInfoArray: Array<SettingsInfoArrayType> = [
    {
        img: personalInfo,
        settingTitle: 'Personal info',
        description: 'Provide personal details and how we can reach you',
        route: '/settings/personal-info'
    },
    {
        img: userShield,
        settingTitle: 'Login & security',
        description: 'Update your password and secure your account',
        route: 'login-and-security'
    }
]