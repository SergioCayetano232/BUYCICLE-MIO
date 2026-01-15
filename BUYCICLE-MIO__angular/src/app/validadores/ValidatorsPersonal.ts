import { AbstractControl, ValidationErrors } from "@angular/forms";

export default {
    comparePasswords: (confirmPassword: string) => {
        return (control: AbstractControl):ValidationErrors | null => {                       
            return control.value !== confirmPassword ? { 'comparePasswords': { message: 'Las contraseñas no coinciden.' } } : null;
        }
    }
}