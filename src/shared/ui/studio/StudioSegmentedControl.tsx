type StudioSegmentedOption<Value extends string> = {
  label: string;
  value: Value;
};

type StudioSegmentedControlProps<Value extends string> = {
  'aria-label': string;
  onChange: (value: Value) => void;
  options: readonly StudioSegmentedOption<Value>[];
  value: Value;
};

export const StudioSegmentedControl = <Value extends string>({
  'aria-label': label,
  onChange,
  options,
  value,
}: StudioSegmentedControlProps<Value>) => (
  <div aria-label={label} className="studio-segmented-control" role="group">
    {options.map((option) => (
      <button
        aria-pressed={value === option.value}
        className={value === option.value ? 'is-selected' : ''}
        key={option.value}
        onClick={() => onChange(option.value)}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </div>
);
