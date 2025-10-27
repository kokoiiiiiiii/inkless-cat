export type SectionToggleHandler = (sectionKey: string, enabled: boolean) => void;
export type SectionReorderHandler = (order: string[]) => void;
export type SectionFocusHandler = (sectionKey: string, itemKey: string) => void;
export type RegisterSectionRef = (sectionKey: string, node: HTMLElement | null) => void;
