export function createInitialContactFaqState(firstCategory) {
  return {
    openCategory: firstCategory ?? null,
    openQuestion: null
  };
}

export function reduceContactFaqInteraction(state, action) {
  if (action.type === 'toggleCategory') {
    return {
      openCategory: state.openCategory === action.category ? null : action.category,
      openQuestion: null
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
