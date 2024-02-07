import { validateAccount, validatePassword, validateName, validateEmail } from './userValidation';

/** 註冊 validation */
export const signupValidation = Object.values({
    validateAccount,
    validatePassword,
    validateName,
    validateEmail,
});