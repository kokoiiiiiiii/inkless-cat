import { StudioCard, StudioIcon, StudioSelect } from '@shared/ui/studio';

export const DemoProviderSettings = () => (
  <StudioCard className="studio-demo-card studio-provider-settings" inset="comfortable">
    <div className="studio-provider-settings__banner">
      <span>
        <StudioIcon name="shield" />
      </span>
      <div>
        <strong>服务连接在此原型中已关闭</strong>
        <p>不会读取、输入、保存或发送 API 凭证。</p>
      </div>
    </div>
    <StudioSelect disabled label="服务提供方（演示）" onValueChange={(value) => value} value="mock">
      <option value="mock">未连接 · 本地演示</option>
      <option disabled value="future">
        其他服务（后续阶段）
      </option>
    </StudioSelect>
    <div className="studio-provider-settings__locked" aria-disabled="true">
      <span>凭证字段</span>
      <strong>已关闭</strong>
      <small>正式密钥保护和验证流程会在业务迁移阶段接入。</small>
    </div>
  </StudioCard>
);
