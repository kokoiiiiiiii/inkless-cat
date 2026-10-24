import { StudioIconButton } from './StudioButton';
import { StudioIcon } from './StudioIcon';

type StudioToastProps = {
  message: string;
  onDismiss: () => void;
};

export const StudioToast = ({ message, onDismiss }: StudioToastProps) => (
  <div aria-live="polite" className="studio-toast" role="status">
    <span className="studio-toast__icon">
      <StudioIcon name="check" />
    </span>
    <span>{message}</span>
    <StudioIconButton label="关闭通知" onClick={onDismiss}>
      <StudioIcon name="close" />
    </StudioIconButton>
  </div>
);
