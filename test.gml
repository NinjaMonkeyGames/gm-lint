for (let i = ancestors.length - 1; i >= 0; i--) {
  const anc = ancestors[i];
  // A break can't reach past a function boundary to an outer loop.
  if (isFunctionLike(anc)) break;
  if (BREAK_TARGETS.has(anc.type)) return; // valid
}