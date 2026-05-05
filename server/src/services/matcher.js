function jaccard(a = [], b = []) {
  const A = new Set(a.map(x => x.toLowerCase()));
  const B = new Set(b.map(x => x.toLowerCase()));
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
}

function textSim(a = '', b = '') {
  a = a.toLowerCase(); b = b.toLowerCase();
  const as = new Set(a.replace(/[^\w\s]/g,'').split(/\s+/).filter(Boolean));
  const bs = new Set(b.replace(/[^\w\s]/g,'').split(/\s+/).filter(Boolean));
  if (as.size === 0 || bs.size === 0) return 0;
  const inter = [...as].filter(x => bs.has(x)).length;
  const avg = (as.size + bs.size)/2;
  return inter / avg; 
}

function locationScore(a = '', b = '') {
  if (!a || !b) return 0;
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a.includes(b) || b.includes(a)) return 1;
  return 0;
}

function computeScore(reqA, reqB) {
  const categoryScore = (reqA.category && reqB.category && reqA.category === reqB.category) ? 1 : 0;
  const textSimScore = textSim((reqA.title||'') + ' ' + (reqA.description||''), (reqB.title||'') + ' ' + (reqB.description||''));
  const tagScore = jaccard(reqA.tags || [], reqB.tags || []);
  const locScore = locationScore(reqA.locationText || '', reqB.locationText || '');
  const score = 0.3*categoryScore + 0.4*textSimScore + 0.2*tagScore + 0.1*locScore;
  return Math.min(1, Math.max(0, score));
}

module.exports = { computeScore, jaccard, textSim };
