// Usage: npm run eval:ai   → k-fold cross-validation accuracy of the triage model on the labelled sample set.
import { DATASET, TYPE_LEXICON, SEVERITY_LEXICON } from '../ai/dataset.js';
import { train, predict, typeSamples, sevSamples } from '../ai/triage.js';

const K = 5;
let seed = 42; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const data = [...DATASET].sort(() => rnd() - 0.5);
const folds = Array.from({ length: K }, (_, i) => data.filter((_, j) => j % K === i));
const res = { type: 0, severity: 0 };
folds.forEach((test, i) => {
  const trainSet = folds.filter((_, j) => j !== i).flat();
  const tm = train([...typeSamples(trainSet), ...TYPE_LEXICON]), sm = train([...sevSamples(trainSet), ...SEVERITY_LEXICON]);
  for (const [text, type, sev] of test) {
    if (predict(tm, text).label === type) res.type++;
    if (predict(sm, text).label === sev) res.severity++;
  }
});
const n = data.length;
console.log(`Samples: ${n}  |  ${K}-fold cross-validation`);
console.log(`Type accuracy:     ${(100 * res.type / n).toFixed(1)}%`);
console.log(`Severity accuracy: ${(100 * res.severity / n).toFixed(1)}%`);
console.log('Note: small hand-written dataset — add real labelled reports to improve and re-run.');
