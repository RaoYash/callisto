import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { z, ZodObject } from 'zod';

/**
 * A custom Angular ValidatorFn that uses a Zod schema for validation.
 * This function is the bridge between Zod's validation and Angular's forms.
 *
 * @param schema The Zod schema to validate against.
 * @returns An Angular ValidatorFn.
 */
export function zodValidator(schema: z.ZodObject<any>): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Use Zod's safeParse method to check the form group's value.
    // safeParse doesn't throw an error on failure, which is ideal for validation.
    const result = schema.safeParse(control.value);

    // If validation is successful, Zod returns a `success: true` object.
    // In this case, the form is valid, so we return null.
    if (result.success) {
      return null;
    }

    // If validation fails, we get a `success: false` object containing the errors.
    // We can format these errors to be used by Angular's validation system.
    const errors: { [key: string]: string } = {};
    result.error.issues.forEach((issue) => {
      // The `path` array contains the name of the field with the error.
      const fieldName = issue.path.join('.');
      errors[fieldName] = issue.message;
    });

    // Return the errors object. Angular interprets a non-null return as a validation failure.
    return { zod: errors };
  };
}

@Injectable({
  providedIn: 'root',
})
export class ZodFormBuilderService {
  constructor(private fb: FormBuilder) {}

  /**
   * Creates an Angular FormGroup from a Zod schema.
   *
   * @param schema The ZodObject schema to convert into a form.
   * @returns A FormGroup instance with controls matching the schema keys
   * and a custom validator that uses the Zod schema.
   */
  createFormGroup<T extends ZodObject<any>>(schema: T): FormGroup {
    const formControls: { [key in keyof T['shape']]: FormControl } = {} as any;

    // Get the keys from the Zod schema's shape (e.g., 'departureCity', 'passengers').
    const schemaKeys = Object.keys(schema.shape);

    // Iterate over each key in the schema to create a corresponding FormControl.
    for (const key of schemaKeys) {
      // We can extract default values from the schema if they exist.
      const defaultValue =
        schema.shape[key] instanceof z.ZodDefault
          ? schema.shape[key]._def.defaultValue()
          : '';

      formControls[key as keyof T['shape']] = new FormControl(defaultValue);
    }

    // Create the FormGroup with the generated controls.
    const group = this.fb.group(formControls);

    // Add our custom Zod-based validator to the entire group.
    // This allows for complex, cross-field validation if defined in the schema.
    group.setValidators(zodValidator(schema));

    return group;
  }
}
