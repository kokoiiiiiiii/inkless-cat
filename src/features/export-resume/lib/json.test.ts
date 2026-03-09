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
      [Project Link](https://github.com/example/resume-craft)

      ### FlowChart Pro Collaboration Board ｜ Frontend Lead
      Implemented multi-user realtime collaboration via WebSocket and optimised drawing experience for the education sector."
    `);
  });
});
