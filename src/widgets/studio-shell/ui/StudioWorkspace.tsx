import type { ReactNode } from 'react';

type StudioWorkspaceProps = {
  editor: ReactNode;
  preview: ReactNode;
  view: 'edit' | 'preview';
};

export const StudioWorkspace = ({ editor, preview, view }: StudioWorkspaceProps) => (
  <main className="studio-workspace" data-mobile-view={view}>
    <div className="studio-workspace__editor">{editor}</div>
    <div className="studio-workspace__preview">{preview}</div>
  </main>
);
