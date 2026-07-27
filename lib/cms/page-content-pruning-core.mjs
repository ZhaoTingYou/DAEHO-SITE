function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function pruneObjectPaths(content, paths) {
  for (const path of paths) {
    const segments = path.split('.').filter(Boolean);
    const leaf = segments.pop();

    if (!leaf) {
      continue;
    }

    let current = content;

    for (const segment of segments) {
      if (!isObject(current) || !isObject(current[segment])) {
        current = null;
        break;
      }

      current = current[segment];
    }

    if (isObject(current)) {
      delete current[leaf];
    }
  }

  return content;
}

