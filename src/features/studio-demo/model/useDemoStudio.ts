import { useCallback, useState } from 'react';

export type DemoResume = {
  name: string;
  role: string;
  email: string;
  location: string;
  summary: string;
};

export type DemoModuleId = 'experience' | 'projects' | 'education' | 'skills';

export type DemoModule = {
  id: DemoModuleId;
  label: string;
  visible: boolean;
};

export type DemoTemplateId = 'mist' | 'folio' | 'column';

const initialResume: DemoResume = {
  name: '林映岚',
  role: '产品设计师 · 体验策略',
  email: 'yinglan@example.test',
  location: '上海，中国',
  summary: '关注复杂工具的清晰表达与可持续体验。擅长将用户研究、产品策略和细致的界面设计连接起来。',
};

const initialModules: DemoModule[] = [
  { id: 'experience', label: '工作经历', visible: true },
  { id: 'projects', label: '项目经验', visible: true },
  { id: 'education', label: '教育经历', visible: true },
  { id: 'skills', label: '技能', visible: true },
];

export const useDemoStudio = () => {
  const [resume, setResume] = useState(initialResume);
  const [modules, setModules] = useState(initialModules);
  const [template, setTemplate] = useState<DemoTemplateId>('mist');
  const [announcement, setAnnouncement] = useState('');

  const updateResume = useCallback(
    <Key extends keyof DemoResume>(key: Key, value: DemoResume[Key]) => {
      setResume((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const toggleModule = useCallback(
    (id: DemoModuleId) => {
      const changed = modules.find((module) => module.id === id);
      if (!changed) return;

      setModules((current) =>
        current.map((module) =>
          module.id === id ? { ...module, visible: !module.visible } : module,
        ),
      );
      setAnnouncement(`${changed.label}已${changed.visible ? '隐藏' : '显示'}，预览已更新。`);
    },
    [modules],
  );

  const moveModule = useCallback(
    (id: DemoModuleId, direction: -1 | 1) => {
      const index = modules.findIndex((module) => module.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= modules.length) return;

      const reordered = [...modules];
      const currentModule = reordered[index];
      const targetModule = reordered[nextIndex];
      if (!currentModule || !targetModule) return;
      reordered[index] = targetModule;
      reordered[nextIndex] = currentModule;
      setModules(reordered);
      setAnnouncement(`已将${reordered[nextIndex]?.label ?? '模块'}移动到第 ${nextIndex + 1} 位。`);
    },
    [modules],
  );

  return {
    announcement,
    modules,
    moveModule,
    resume,
    setAnnouncement,
    setTemplate,
    template,
    toggleModule,
    updateResume,
  };
};
