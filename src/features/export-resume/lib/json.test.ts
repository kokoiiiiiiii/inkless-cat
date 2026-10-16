import { createEmptyResume, createSampleResume } from '@entities/resume';
import { describe, expect, it } from 'vitest';

import { resumeToJson } from './json';
import { resumeToMarkdown } from './markdown';

describe('resume export', () => {
  it('serializes canonical resume json', () => {
    expect(resumeToJson(createEmptyResume())).toMatchInlineSnapshot(`
      "{
        "schemaVersion": 1,
        "personal": {
          "fullName": "",
          "title": "",
          "email": "",
          "phone": "",
          "location": "",
          "photo": "",
          "summary": "",
          "extras": []
        },
        "socials": [],
        "experience": [],
        "projects": [],
        "education": [],
        "skills": [],
        "languages": [],
        "interests": [],
        "awards": [],
        "customSections": [],
        "settings": {
          "personal": {
            "showPhoto": true,
            "photoSize": 120,
            "photoPosition": "right"
          }
        }
      }"
    `);
  });

  it('serializes markdown for active sections', () => {
    const markdown = resumeToMarkdown(createSampleResume('en'), {
      activeSections: ['experience', 'projects'],
      t: (key) => key,
    });

    expect(markdown).toMatchInlineSnapshot(`
      "# Qing Chen
      **Senior Full-Stack Engineer | React · TypeScript · .NET**

      chenqing@example.com ｜ +86 138-0000-0000 ｜ Shanghai

      Portfolio：https://chenqing.dev ｜ GitHub：https://github.com/chenqing

      ## Summary
      Six years of full-stack experience building high-performance, maintainable web apps. Strong in design systems, complex interactions, and engineering workflows; collaborates closely with cross-functional teams to ship product innovations.

      ## Work Experience
      ### Acme Tech Group ｜ Senior Engineer ｜ Shanghai（2021-05 — Present）
      - Led the rollout of the company design system, shipping 30+ reusable components and boosting UI delivery efficiency by 45%.
      - Owned performance optimisation for the flagship product, reducing first paint time by 38%.
      - Partnered with backend and product to ship multiple major releases, sustaining 90%+ user satisfaction.

      ### Atlas Corp ｜ Frontend Engineer ｜ Beijing（2018-07 — 2021-04）
      - Built an online editor with templated layouts and realtime sync, dramatically shortening delivery timelines.
      - Established an automated testing stack with 80% coverage.
      - Championed modern tooling (TypeScript, ESLint, Prettier) across the team.

      ## Projects
      ### ResumeCraft Online Builder ｜ Full-Stack Developer
      Built a visual resume editor with drag-and-drop layout, template switching, and PDF export, serving 50k+ users.
      [Project Link](<https://github.com/example/resume-craft>)

      ### FlowChart Pro Collaboration Board ｜ Frontend Lead
      Implemented multi-user realtime collaboration via WebSocket and optimised drawing experience for the education sector."
    `);
  });

  it('exports personal summary, project highlights, and active section order', () => {
    const resume = createEmptyResume();
    resume.personal.fullName = 'A [candidate]';
    resume.personal.summary = 'Summary *with* content';
    resume.experience = [
      {
        id: 'experience-1',
        company: 'Example Co.',
        role: 'Engineer',
        location: '',
        startDate: '2024',
        endDate: 'Present',
        highlights: ['Experience item'],
      },
    ];
    resume.projects = [
      {
        id: 'project-1',
        name: 'Project #1',
        role: '',
        summary: 'Project summary',
        link: 'javascript:alert(1)',
        highlights: ['Project highlight'],
      },
    ];
    resume.customSections = [
      {
        id: 'custom-one',
        title: 'Custom [module]',
        mode: 'text',
        items: [],
        fields: [],
        text: 'Custom text',
      },
    ];

    const markdown = resumeToMarkdown(resume, {
      activeSections: ['projects', 'custom:custom-one', 'experience'],
    });

    expect(markdown).toContain('## Summary\nSummary \\*with\\* content');
    expect(markdown).toContain('Project highlight');
    expect(markdown).toContain('Project #1');
    expect(markdown).not.toContain('javascript:alert');
    expect(markdown.indexOf('## Projects')).toBeLessThan(
      markdown.indexOf(String.raw`## Custom \[module\]`),
    );
    expect(markdown.indexOf(String.raw`## Custom \[module\]`)).toBeLessThan(
      markdown.indexOf('## Work Experience'),
    );
    expect(markdown).not.toContain('## Education');
  });

  it('uses the requested UI locale for Markdown headings', () => {
    const resume = createEmptyResume();
    resume.projects = [
      {
        id: 'project-1',
        name: '项目',
        role: '',
        summary: '',
        link: '',
        highlights: [],
      },
    ];
    const markdown = resumeToMarkdown(resume, {
      activeSections: ['projects'],
      t: (key) => (key === 'exporter.markdown.projectsHeading' ? '项目经历' : key),
    });

    expect(markdown).toContain('## 项目经历');
  });
});
