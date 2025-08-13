import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { z } from 'zod';
import { ZodFormBuilderService } from '../../services/zod-form-builder';

@Component({
  selector: 'callisto-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-form.html',
  styleUrls: ['./dynamic-form.scss'],
})
export class DynamicFormComponent implements OnChanges {
  /**
   * The Zod schema that defines the form's structure and validation.
   * This is the core input that drives the component.
   */
  @Input() schema!: z.ZodObject<any>;

  /**
   * The name of the tool this form is for. This is passed back
   * when the form is submitted.
   */
  @Input() toolName!: string;

  /**
   * Emits the form's data when the user submits a valid form.
   * The payload includes the tool's name and the form data.
   */
  @Output() formSubmit = new EventEmitter<{
    tool_name: string;
    data: any;
  }>();

  form!: FormGroup;
  formFields: { key: string; type: string; label: string }[] = [];

  constructor(private zodFormBuilder: ZodFormBuilderService) {}

  /**
   * Detects changes to the input schema and rebuilds the form.
   * This makes the component reactive to new schemas sent from the agent.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema'] && this.schema) {
      this.buildForm();
    }
  }

  private buildForm(): void {
    this.form = this.zodFormBuilder.createFormGroup(this.schema);
    this.formFields = Object.keys(this.schema.shape).map((key) => {
      const fieldSchema = this.schema.shape[key];
      let type = 'text'; // Default to text input

      // Infer input type from Zod schema type
      if (fieldSchema instanceof z.ZodNumber) {
        type = 'number';
      } else if (fieldSchema instanceof z.ZodEnum) {
        type = 'select';
      }
      // Add more type inferences as needed (e.g., date, email)

      return {
        key,
        type,
        label: this.camelCaseToTitleCase(key),
      };
    });
  }

  /**
   * Handles the form submission. If the form is valid, it emits the
   * form data.
   */
  onSubmit(): void {
    if (this.form.valid) {
      this.formSubmit.emit({
        tool_name: this.toolName,
        data: this.form.value,
      });
    } else {
      // Mark all fields as touched to display validation errors
      this.form.markAllAsTouched();
      console.error('Form is invalid:', this.form.errors);
    }
  }

  private camelCaseToTitleCase(text: string): string {
    const result = text.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
