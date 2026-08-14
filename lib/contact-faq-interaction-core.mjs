export function createInitialContactFaqState(firstCategory) {
  return {
    openCategory: firstCategory ?? null,
    openQuestion: null,
    expandedCategories: []
  };
}

export function reduceContactFaqInteraction(state, action) {
  if (action.type === 'toggleCategory') {
    return {
      ...state,
      openCategory: state.openCategory === action.category ? null : action.category,
      openQuestion: null
    };
  }

  if (action.type === 'toggleCategoryQuestions') {
    const expanded = state.expandedCategories.includes(action.category);

    return {
      ...state,
      expandedCategories: expanded
        ? state.expandedCategories.filter((category) => category !== action.category)
        : [...state.expandedCategories, action.category],
      openQuestion: expanded && action.hiddenQuestions.includes(state.openQuestion)
        ? null
        : state.openQuestion
    };
  }

  if (action.type === 'toggleQuestion') {
    return {
      ...state,
      openQuestion: state.openQuestion === action.question ? null : action.question
    };
  }

  return state;
}
