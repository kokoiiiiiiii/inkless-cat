import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudioInput, StudioSelect, StudioTextarea } from './StudioField';

describe('StudioField controls', () => {
  it('generates unique ids and associates each label with its control', () => {
    render(
      <>
        <StudioInput label="Name" onValueChange={() => {}} />
        <StudioTextarea label="Summary" onValueChange={() => {}} />
        <StudioSelect label="Template" onValueChange={() => {}}>
          <option value="one">One</option>
        </StudioSelect>
      </>,
    );

    const controls = [
      screen.getByLabelText('Name'),
      screen.getByLabelText('Summary'),
      screen.getByLabelText('Template'),
    ];
    const ids = controls.map((control) => control.id);

    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(controls.length);
    for (const control of controls) {
      expect(control.closest('.studio-field')?.querySelector('label')?.htmlFor).toBe(control.id);
    }
  });

  it('keeps a caller id and class while merging custom and help descriptions', () => {
    render(
      <>
        <span id="external-description">External description.</span>
        <span id="extra-description">Extra description.</span>
        <StudioInput
          aria-describedby="external-description extra-description external-description"
          className="custom-control"
          helpText="Internal help."
          id="profile-name"
          label="Name"
          onValueChange={() => {}}
        />
      </>,
    );

    const control = screen.getByLabelText('Name');
    const label = document.querySelector('label[for="profile-name"]');
    const help = document.querySelector('.studio-field__help');
    const describedBy = control.getAttribute('aria-describedby')?.split(/\s+/u);

    expect(control.id).toBe('profile-name');
    expect(label).toBeTruthy();
    expect(control.classList.contains('studio-control')).toBe(true);
    expect(control.classList.contains('custom-control')).toBe(true);
    expect(describedBy).toContain('external-description');
    expect(describedBy).toContain('extra-description');
    expect(describedBy).toContain(help?.id);
    expect(describedBy).toHaveLength(3);
    expect(help?.textContent).toBe('Internal help.');
  });

  it('preserves input values, change callbacks, disabled and required semantics', () => {
    const onValueChange = vi.fn();
    const onDefaultValueChange = vi.fn();
    render(
      <>
        <StudioInput
          autoComplete="name"
          aria-invalid="true"
          label="Editable name"
          onValueChange={onValueChange}
          required
          value="Initial"
        />
        <StudioInput
          defaultValue="Uncontrolled"
          label="Uncontrolled name"
          onValueChange={onDefaultValueChange}
        />
        <StudioInput disabled label="Disabled name" onValueChange={() => {}} />
      </>,
    );

    const editable = screen.getByLabelText<HTMLInputElement>('Editable name');
    const uncontrolled = screen.getByLabelText<HTMLInputElement>('Uncontrolled name');
    const disabled = screen.getByLabelText<HTMLInputElement>('Disabled name');
    fireEvent.change(editable, { target: { value: 'Updated' } });
    fireEvent.change(uncontrolled, { target: { value: 'Uncontrolled update' } });

    expect(editable.value).toBe('Initial');
    expect(editable.autocomplete).toBe('name');
    expect(editable.required).toBe(true);
    expect(editable.getAttribute('aria-invalid')).toBe('true');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('Updated');
    expect(uncontrolled.value).toBe('Uncontrolled update');
    expect(onDefaultValueChange).toHaveBeenCalledTimes(1);
    expect(onDefaultValueChange).toHaveBeenCalledWith('Uncontrolled update');
    expect(disabled.disabled).toBe(true);
  });

  it('merges textarea attributes and reports edited values', () => {
    const onValueChange = vi.fn();
    render(
      <>
        <span id="summary-note">External summary note.</span>
        <StudioTextarea
          aria-describedby="summary-note"
          className="custom-summary"
          helpText="Internal summary help."
          id="profile-summary"
          label="Summary"
          onValueChange={onValueChange}
          required
          value="Draft"
        />
      </>,
    );

    const textarea = screen.getByLabelText<HTMLTextAreaElement>('Summary');
    fireEvent.change(textarea, { target: { value: 'Revised' } });

    expect(textarea.id).toBe('profile-summary');
    expect(textarea.labels?.[0]?.htmlFor).toBe('profile-summary');
    expect(textarea.classList.contains('studio-control--textarea')).toBe(true);
    expect(textarea.classList.contains('custom-summary')).toBe(true);
    expect(textarea.getAttribute('aria-describedby')?.split(/\s+/u)).toHaveLength(2);
    expect(textarea.required).toBe(true);
    expect(textarea.value).toBe('Draft');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('Revised');
  });

  it('merges select descriptions and preserves disabled, required, and selection behavior', () => {
    const onValueChange = vi.fn();
    render(
      <>
        <span id="template-note">External template note.</span>
        <StudioSelect
          aria-describedby="template-note"
          className="custom-template"
          defaultValue="one"
          helpText="Choose a template."
          id="resume-template"
          label="Template"
          onValueChange={onValueChange}
          required
        >
          <option value="one">One</option>
          <option value="two">Two</option>
        </StudioSelect>
        <StudioSelect disabled label="Locked template" onValueChange={() => {}}>
          <option value="locked">Locked</option>
        </StudioSelect>
      </>,
    );

    const select = screen.getByLabelText<HTMLSelectElement>('Template');
    const disabled = screen.getByLabelText<HTMLSelectElement>('Locked template');
    fireEvent.change(select, { target: { value: 'two' } });

    expect(select.id).toBe('resume-template');
    expect(select.labels?.[0]?.htmlFor).toBe('resume-template');
    expect(select.classList.contains('studio-control')).toBe(true);
    expect(select.classList.contains('custom-template')).toBe(true);
    expect(select.getAttribute('aria-describedby')?.split(/\s+/u)).toHaveLength(2);
    expect(select.required).toBe(true);
    expect(select.value).toBe('two');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('two');
    expect(disabled.disabled).toBe(true);
  });
});
