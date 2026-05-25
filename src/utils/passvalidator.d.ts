export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}
declare const validatePassword: (password: string) => PasswordValidationResult;
export default validatePassword;
//# sourceMappingURL=passvalidator.d.ts.map