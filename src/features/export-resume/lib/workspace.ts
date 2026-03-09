import type { WorkspaceData } from '@entities/workspace';

export const workspaceToJson = (workspace: WorkspaceData): string =>
  JSON.stringify(workspace, undefined, 2);
