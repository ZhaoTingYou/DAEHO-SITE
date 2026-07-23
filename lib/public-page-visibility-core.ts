export type TechniqueVisibilityMessages = {
  home: {
    pillars: {
      items: Array<{href: string}>;
    };
  };
  specialty: {
    branches: {
      items: Array<{href: string}>;
    };
  };
};

export function normalizeTechniquePageVisibility<T extends TechniqueVisibilityMessages>(
  messages: T,
  isVisible: boolean
): T {
  if (isVisible) {
    return messages;
  }

  for (const pillar of messages.home.pillars.items) {
    if (pillar.href === '/mastery/technique') {
      pillar.href = '/mastery/making';
    }
  }

  messages.specialty.branches.items = messages.specialty.branches.items.filter(
    (item) => item.href !== '/mastery/technique'
  );

  return messages;
}
