import { StudioButton, StudioCard, StudioTextarea } from '@shared/ui/studio';
import { useState } from 'react';

type DemoInterviewProps = {
  onNotice: (message: string) => void;
};

const questions = [
  '最近一次让你感到自豪的工作成果是什么？你负责了哪些部分？',
  '这个成果带来了什么可观察的变化？可以分享一个具体例子吗？',
  '你会如何用一句话描述自己最擅长解决的问题？',
];

export const DemoInterview = ({ onNotice }: DemoInterviewProps) => {
  const [answer, setAnswer] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);

  return (
    <StudioCard className="studio-demo-card studio-interview" inset="comfortable">
      <div className="studio-interview__badge">演示界面 · 不调用模型</div>
      <p className="studio-eyebrow">QUESTION {String(questionIndex + 1).padStart(2, '0')} / 03</p>
      <h2>{questions[questionIndex]}</h2>
      <StudioTextarea
        label="你的回答（仅当前页面）"
        maxLength={800}
        onValueChange={setAnswer}
        placeholder="写下要点或具体例子…"
        rows={5}
        value={answer}
      />
      <div className="studio-interview__footer">
        <span>{answer.length} / 800</span>
        <StudioButton
          onClick={() => {
            setQuestionIndex((current) => (current + 1) % questions.length);
            onNotice('演示问题已切换；内容仍只保留在当前页面。');
          }}
          variant="primary"
        >
          继续问题
        </StudioButton>
      </div>
    </StudioCard>
  );
};
