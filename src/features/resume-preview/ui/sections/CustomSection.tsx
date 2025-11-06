import { cn } from '../../lib/cn';
import { SectionContainer } from '../components/SectionContainer';
import type { CustomSectionProps } from './types';

export const CustomSection = ({
  sectionKey,
  section,
  variant,
  themeStyles,
  registerSectionRef,
  accentStyle,
  accentBulletStyle,
}: CustomSectionProps) => {
  if (!section) {
    return null;
  }

  const title = section.title || '自定义模块';
  const mode = section.mode || 'list';
  const items = Array.isArray(section.items)
    ? section.items.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
  const fields = Array.isArray(section.fields)
    ? section.fields.filter((field) => field && (field.label || field.value))
    : [];
  const text = typeof section.text === 'string' ? section.text.trim() : '';

  return (
    <SectionContainer
      title={title}
      sectionKey={sectionKey}
      registerSectionRef={registerSectionRef}
      accentStyle={accentStyle}
      variant={variant}
      headingStyle={themeStyles.heading}
    >
      {mode === 'fields' && fields.length > 0 ? (
        <dl className="space-y-2">
          {fields.map((field) => (
            <div key={field.id} className="flex gap-2 text-sm">
              <dt
                className={cn('font-semibold uppercase tracking-wide', variant.metaLabel)}
                style={themeStyles.heading}
              >
                {field.label || '字段'}
              </dt>
              <dd className={cn('flex-1 break-words', variant.metaValue)} style={themeStyles.text}>
                {field.value || '填写内容'}
              </dd>
            </div>
          ))}
        </dl>
      ) : mode === 'text' && text ? (
        <p
          className={cn('whitespace-pre-line text-sm', variant.metaValue)}
          style={themeStyles.text}
        >
          {text}
        </p>
      ) : items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={item || index} className="flex gap-2">
              <span
                className={cn('mt-[0.4rem] h-1.5 w-1.5 flex-shrink-0 rounded-full', variant.bullet)}
                style={accentBulletStyle}
              />
              <span className={cn('flex-1', variant.metaValue)} style={themeStyles.text}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn('text-slate-500 dark:text-slate-400', variant.metaValue)}
          style={themeStyles.muted}
        >
          暂无内容
        </p>
      )}
    </SectionContainer>
  );
};
