// NLP incident triage: multinomial Naive Bayes (Laplace smoothing) over word unigrams + bigrams.
// Predicts incident TYPE and SEVERITY with a confidence score. A human always makes the final decision.
import { DATASET, TYPE_LEXICON, SEVERITY_LEXICON } from './dataset.js';

const STOP = new Set(['the', 'is', 'in', 'on', 'at', 'a', 'an', 'of', 'to', 'and', 'are', 'was', 'near', 'there', 'it', 'has', 'have', 'with', 'for', 'ho', 'hai', 'hain', 'ka', 'ki', 'ke', 'mein', 'se', 'ko', 'ne']);

export function tokenize(text) {
  const w = String(text).toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ').split(/\s+/).filter(x => x.length > 1 && !STOP.has(x));
  const grams = [...w];
  for (let i = 0; i < w.length - 1; i++) grams.push(w[i] + '_' + w[i + 1]);
  return grams;
}

/** samples: [text, label][] */
export function train(samples) {
  const classes = {}, vocab = new Set();
  for (const s of samples) {
    const c = (classes[s[1]] ??= { docs: 0, words: {}, total: 0 });
    c.docs++;
    for (const t of tokenize(s[0])) { c.words[t] = (c.words[t] || 0) + 1; c.total++; vocab.add(t); }
  }
  return { classes, vocab: vocab.size, docs: samples.length };
}

export function predict(model, text) {
  const toks = tokenize(text);
  const scores = Object.entries(model.classes).map(([label, c]) => {
    let s = Math.log(c.docs / model.docs);
    for (const t of toks) s += Math.log(((c.words[t] || 0) + 1) / (c.total + model.vocab));
    return [label, s];
  });
  const max = Math.max(...scores.map(s => s[1]));
  const exp = scores.map(([l, s]) => [l, Math.exp(s - max)]);
  const sum = exp.reduce((a, [, v]) => a + v, 0);
  const [label, p] = exp.map(([l, v]) => [l, v / sum]).sort((a, b) => b[1] - a[1])[0];
  return { label, confidence: p };
}

export const typeSamples = d => d.map(r => [r[0], r[1]]);
export const sevSamples = d => d.map(r => [r[0], r[2]]);
const typeModel = train([...typeSamples(DATASET), ...TYPE_LEXICON]);
const sevModel = train([...sevSamples(DATASET), ...SEVERITY_LEXICON]);

/** → { type, severity, confidence } (confidence = mean of the two class probabilities) */
export function triage(text) {
  const t = predict(typeModel, text), s = predict(sevModel, text);
  return { type: t.label, severity: s.label, confidence: +((t.confidence + s.confidence) / 2).toFixed(3) };
}
