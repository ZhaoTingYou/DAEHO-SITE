import type {ContactFaqGroupId} from './contact-faq-core.mjs';

export type ContactFaqInteractionState = {
  openCategory: ContactFaqGroupId | null;
  openQuestion: string | null;
};

export type ContactFaqInteractionAction =
  | {type: 'toggleCategory'; category: ContactFaqGroupId}
  | {type: 'toggleQuestion'; question: string};

export function createInitialContactFaqState(
  firstCategory: ContactFaqGroupId | null
): ContactFaqInteractionState;

export function reduceContactFaqInteraction(
  state: ContactFaqInteractionState,
  action: ContactFaqInteractionAction
): ContactFaqInteractionState;
