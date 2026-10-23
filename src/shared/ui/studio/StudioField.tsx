import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';

type FieldShellProps = {
  label: string;
  helpText?: string;
  children: (id: string, describedBy?: string) => ReactNode;
};

const FieldShell = ({ label, helpText, children }: FieldShellProps) => {
  const fieldId = useId();
  const helpId = `${fieldId}-help`;

  return (
    <div className="studio-field">
      <label className="studio-field__label" htmlFor={fieldId}>
        {label}
      </label>
      {children(fieldId, helpText ? helpId : undefined)}
      {helpText ? (
        <span className="studio-field__help" id={helpId}>
          {helpText}
        </span>
      ) : null}
    </div>
  );
};

type StudioInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  helpText?: string;
  onValueChange: (value: string) => void;
};

export const StudioInput = ({ label, helpText, onValueChange, ...props }: StudioInputProps) => (
  <FieldShell label={label} helpText={helpText}>
    {(id, describedBy) => (
      <input
        className="studio-control"
        id={id}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.currentTarget.value)
        }
        aria-describedby={describedBy}
        {...props}
      />
    )}
  </FieldShell>
);

type StudioTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label: string;
  helpText?: string;
  onValueChange: (value: string) => void;
};

export const StudioTextarea = ({
  label,
  helpText,
  onValueChange,
  ...props
}: StudioTextareaProps) => (
  <FieldShell label={label} helpText={helpText}>
    {(id, describedBy) => (
      <textarea
        className="studio-control studio-control--textarea"
        id={id}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onValueChange(event.currentTarget.value)
        }
        aria-describedby={describedBy}
        {...props}
      />
    )}
  </FieldShell>
);

type StudioSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label: string;
  helpText?: string;
  onValueChange: (value: string) => void;
};

export const StudioSelect = ({
  children,
  label,
  helpText,
  onValueChange,
  ...props
}: StudioSelectProps) => (
  <FieldShell label={label} helpText={helpText}>
    {(id, describedBy) => (
      <select
        className="studio-control"
        id={id}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onValueChange(event.currentTarget.value)
        }
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
    )}
  </FieldShell>
);
