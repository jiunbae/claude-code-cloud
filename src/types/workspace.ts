export type WorkspaceStatus = 'ready' | 'creating' | 'cloning' | 'error';

export interface Workspace {
  id: string;
  name: string;
  slug: string; // 디렉토리명 (영문, 숫자, 하이픈만 허용)
  description?: string;
  status: WorkspaceStatus;
  sourceType: 'empty' | 'git';
  gitUrl?: string;
  gitBranch?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  sessionCount?: number; // 조회 시 계산
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  description?: string;
  sourceType: 'empty' | 'git';
  gitUrl?: string;
  gitBranch?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
}
