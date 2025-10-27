export type SectionDefinition = {
  title: string;
  createItem: () => Record<string, unknown>;
};

export type SectionKey =
  | 'socials'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'interests'
  | 'awards';
