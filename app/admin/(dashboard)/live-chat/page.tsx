import {TelegramLiveChatEditor} from '@/app/admin/_components/telegram-live-chat-editor';
import {getAdminI18n} from '@/lib/admin-i18n';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {getTelegramLiveChatAdmin} from '@/lib/cms/repositories';

import {PageHeader} from '../../_components/admin-shell';

export default async function AdminTelegramLiveChatPage() {
  await assertAdminCapability('notifications:manage');
  const {t} = await getAdminI18n();
  const {settings, sessions} = await getTelegramLiveChatAdmin();

  return (
    <>
      <PageHeader title={t('liveChat.title')} description={t('liveChat.description')} />
      <TelegramLiveChatEditor
        initialSettings={settings}
        sessions={sessions}
        copy={{
          setup: t('liveChat.setup'),
          status: t('liveChat.status'),
          enabled: t('liveChat.enabled'),
          disabled: t('liveChat.disabled'),
          connected: t('liveChat.connected'),
          notConnected: t('liveChat.notConnected'),
          botToken: t('liveChat.botToken'),
          botTokenHint: t('liveChat.botTokenHint'),
          tokenSaved: t('liveChat.tokenSaved'),
          tokenMissing: t('liveChat.tokenMissing'),
          clearToken: t('liveChat.clearToken'),
          targetChatId: t('liveChat.targetChatId'),
          targetChatIdHint: t('liveChat.targetChatIdHint'),
          topicId: t('liveChat.topicId'),
          perCustomerTopics: t('liveChat.perCustomerTopics'),
          botUsername: t('liveChat.botUsername'),
          save: t('liveChat.save'),
          connect: t('liveChat.connect'),
          enable: t('liveChat.enable'),
          disableAction: t('liveChat.disable'),
          saved: t('liveChat.saved'),
          connectedMessage: t('liveChat.connectedMessage'),
          error: t('liveChat.error'),
          steps: t('liveChat.steps'),
          step1: t('liveChat.step1'),
          step2: t('liveChat.step2'),
          step3: t('liveChat.step3'),
          step4: t('liveChat.step4'),
          sessions: t('liveChat.sessions'),
          noSessions: t('liveChat.noSessions'),
          customer: t('liveChat.customer'),
          contact: t('liveChat.contact'),
          content: t('liveChat.content'),
          sessionState: t('liveChat.sessionState'),
          inquiry: t('liveChat.inquiry'),
          stateAwaitingConsent: t('liveChat.state.awaitingConsent'),
          stateAwaitingName: t('liveChat.state.awaitingName'),
          stateAwaitingContact: t('liveChat.state.awaitingContact'),
          stateAwaitingContent: t('liveChat.state.awaitingContent'),
          stateNeedsAttention: t('liveChat.state.needsAttention'),
          attentionRequired: t('liveChat.attentionRequired'),
          reconcile: t('liveChat.reconcile'),
          retryDelivery: t('liveChat.retryDelivery'),
          retryDeliveryConfirm: t('liveChat.retryDeliveryConfirm'),
          resetSetup: t('liveChat.resetSetup'),
          resetSetupConfirm: t('liveChat.resetSetupConfirm'),
          stateActive: t('liveChat.state.active'),
          stateClosed: t('liveChat.state.closed'),
          closeConversation: t('liveChat.closeConversation'),
          closeConversationConfirm: t('liveChat.closeConversationConfirm')
        }}
      />
    </>
  );
}
