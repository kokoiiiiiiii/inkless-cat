import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';

type FieldShellProps = {
  baseClassName: string;
  className?: string;
  describedBy?: string;
  id?: string;
  label: string;
  helpText?: string;
  children: (attributes: FieldControlAttributes) => ReactNode;
};

type FieldControlAttributes = {
  className: string;
  describedBy?: string;
  id: string;
};

const mergeIdRefs = (...values: Array<string | undefined>) => {
  const idRefs = values.flatMap((value) => value?.trim().split(/\s+/u).filter(Boolean) ?? []);
  const uniqueIdRefs = [...new Set(idRefs)];
  return uniqueIdRefs.length > 0 ? uniqueIdRefs.join(' ') : undefined;
};

const FieldShell = ({
  baseClassName,
  className,
  describedBy,
  id,
  label,
  helpText,
  children,
}: FieldShellProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helpId = `${generatedId}-help`;
  const fieldClassName = className ? `${baseClassName} ${className}` : baseClassName;
  const fieldDescribedBy = mergeIdRefs(describedBy, helpText ? helpId : undefined);

  return (
    <div className="studio-field">
      <label className="studio-field__label" htmlFor={fieldId}>
        {label}
      </label>
      {children({ className: fieldClassName, describedBy: fieldDescribedBy, id: fieldId })}
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

export const StudioInput = ({
  'aria-describedby': describedBy,
  className,
  helpText,
  id,
  label,
  onValueChange,
  ...props
}: StudioInputProps) => (
  <FieldShell
    baseClassName="studio-control"
    className={className}
    describedBy={describedBy}
    helpText={helpText}
    id={id}
    label={label}
  >
    {({ className: fieldClassName, describedBy: fieldDescribedBy, id: fieldId }) => (
      <input
        {...props}
        className={fieldClassName}
        id={fieldId}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.currentTarget.value)
        }
        aria-describedby={fieldDescribedBy}
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
  className,
  id,
  'aria-describedby': describedBy,
  onValueChange,
  ...props
}: StudioTextareaProps) => (
  <FieldShell
    baseClassName="studio-control studio-control--textarea"
    className={className}
    describedBy={describedBy}
    helpText={helpText}
    id={id}
    label={label}
  >
    {({ className: fieldClassName, describedBy: fieldDescribedBy, id: fieldId }) => (
      <textarea
        {...props}
        className={fieldClassName}
        id={fieldId}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onValueChange(event.currentTarget.value)
        }
        aria-describedby={fieldDescribedBy}
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
  className,
  id,
  'aria-describedby': describedBy,
  onValueChange,
  ...props
}: StudioSelectProps) => (
  <FieldShell
    baseClassName="studio-control"
    className={className}
    describedBy={describedBy}
    helpText={helpText}
    id={id}
    label={label}
  >
    {({ className: fieldClassName, describedBy: fieldDescribedBy, id: fieldId }) => (
      <select
        {...props}
        className={fieldClassName}
        id={fieldId}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onValueChange(event.currentTarget.value)
        }
        aria-describedby={fieldDescribedBy}
      >
        {children}
      </select>
    )}
  </FieldShell>
);
