export type ResumeSocial = {
  id: string;
  label?: string;
  url?: string;
};

export type ResumeExperience = {
  id: string;
  company?: string;
  role?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
};

export type ResumeProject = {
  id: string;
  name?: string;
  role?: string;
  summary?: string;
  link?: string;
  highlights?: string[];
};

export type ResumeEducation = {
  id: string;
  school?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
  details?: string;
};

export type ResumeSkill = {
  id: string;
  title?: string;
  items?: string[];
};

export type ResumeLanguage = {
  id: string;
  name?: string;
  level?: string;
};

export type ResumeInterest = {
  id: string;
  name?: string;
};

export type ResumeAward = {
  id: string;
  name?: string;
  issuer?: string;
  year?: string;
};

export type ResumeCustomField = {
  id: string;
  label: string;
  value: string;
};

export type ResumeCustomSectionMode = 'list' | 'fields' | 'text';

export type ResumeCustomSection = {
  id: string;
  title: string;
  mode: ResumeCustomSectionMode;
  items: string[];
  fields: ResumeCustomField[];
  text: string;
};

export type ResumePersonalExtra = {
  id: string;
  label?: string;
  value?: string;
};

export type ResumePersonal = {
  fullName?: string;
  title?: string;
  email?: string;
  emailLabel?: string;
  phone?: string;
  phoneLabel?: string;
  location?: string;
  locationLabel?: string;
  photo?: string;
  summary?: string;
  extras?: ResumePersonalExtra[];
  [key: string]: unknown;
};

export type ResumeSettings = {
  personal?: {
    showPhoto?: boolean;
    photoSize?: number;
    photoPosition?: 'left' | 'right';
  };
  [key: string]: unknown;
};

export type ResumeData = {
  personal: ResumePersonal;
  socials: ResumeSocial[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  skills: ResumeSkill[];
  languages: ResumeLanguage[];
  interests: ResumeInterest[];
  awards: ResumeAward[];
  customSections: ResumeCustomSection[];
  settings?: ResumeSettings;
  [key: string]: unknown;
};
