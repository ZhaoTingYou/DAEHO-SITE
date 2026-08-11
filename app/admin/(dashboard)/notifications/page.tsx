import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {
  getNotificationHealth,
  listNotificationTemplates
} from '@/lib/cms/repositories';

import {PageHeader} from '../../_components/admin-shell';
import {NotificationSettingsEditor} from '../../_components/notification-settings-editor';

export default async function AdminNotificationsPage() {
  await assertAdminCapability('notifications:manage');
  const {t} = await getAdminI18n();
  const [health, templates] = await Promise.all([
    getNotificationHealth(),
    listNotificationTemplates()
  ]);
  const latestTemplates = Array.from(
    templates.reduce((items, template) => {
      if (!items.has(template.templateKey)) items.set(template.templateKey, template);
      return items;
    }, new Map<string, (typeof templates)[number]>()).values()
  );

  return (
    <>
      <PageHeader
        title={t('notification.title')}
        description={t('notification.description')}
      />
      <NotificationSettingsEditor
        initialSettings={health.settings}
        health={health}
        initialTemplates={latestTemplates}
        copy={{
          settings: t('notification.settings'),
          health: t('notification.health'),
          internalEmail: t('notification.internalEmail'),
          internalEmailEnabled: t('notification.internalEmailEnabled'),
          customerEmailEnabled: t('notification.customerEmailEnabled'),
          kakaoEnabled: t('notification.kakaoEnabled'),
          worker: t('notification.worker'),
          emailConnection: t('notification.emailConnection'),
          kakaoConnection: t('notification.kakaoConnection'),
          kakaoVerification: t('notification.kakaoVerification'),
          kakaoTemplates: t('notification.kakaoTemplates'),
          configured: t('overview.configured'),
          notConfigured: t('overview.notConfigured'),
          enabled: t('notification.enabled'),
          disabled: t('notification.disabled'),
          save: t('notification.save'),
          saved: t('notification.saved'),
          saveError: t('notification.saveError'),
          templates: t('notification.templates'),
          version: t('notification.version'),
          subject: t('notification.subject'),
          kakaoTemplateType: t('notification.kakaoTemplateType'),
          kakaoTemplateBasic: t('notification.kakaoTemplateBasic'),
          kakaoTemplateHighlight: t('notification.kakaoTemplateHighlight'),
          kakaoHighlightTitle: t('notification.kakaoHighlightTitle'),
          templateVariables: t('notification.templateVariables'),
          body: t('notification.body'),
          providerCode: t('notification.providerCode'),
          approval: t('notification.approval'),
          active: t('notification.active'),
          saveVersion: t('notification.saveVersion'),
          templateSaved: t('notification.templateSaved'),
          templateError: t('notification.templateError'),
          kakaoApprovalHint: t('notification.kakaoApprovalHint'),
          testSend: t('notification.testSend'),
          testRecipient: t('notification.testRecipient'),
          testTemplate: t('notification.testTemplate'),
          testSuccess: t('notification.testSuccess'),
          testError: t('notification.testError')
        }}
      />
    </>
  );
}
