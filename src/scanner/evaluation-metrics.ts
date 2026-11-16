export type ScoredIdentification = { expected: string; predicted: string | null; proposed: boolean; acceptedOem: boolean };
const ratio = (value: number, total: number) => total ? value / total : null;
export function categoryMetrics(rows: ScoredIdentification[]) {
  const positive = rows.filter(row => row.expected !== "unknown"), unknown = rows.filter(row => row.expected === "unknown");
  const correct = rows.filter(row => row.proposed && row.expected !== "unknown" && row.predicted === row.expected).length;
  const wrong = rows.filter(row => row.proposed && (row.expected === "unknown" || row.predicted !== row.expected)).length;
  const classes = [...new Set(positive.map(row => row.expected))].sort();
  return { samples: rows.length, positives: positive.length, unknowns: unknown.length, correctProposals: correct, wrongProposals: wrong,
    precision: ratio(correct, correct + wrong), recall: ratio(correct, positive.length),
    unknownRejected: unknown.filter(row => !row.proposed).length,
    unknownRejectionRate: ratio(unknown.filter(row => !row.proposed).length, unknown.length),
    positiveTopOneAccuracy: ratio(positive.filter(row => row.predicted === row.expected).length, positive.length),
    perFamily: classes.map(family => { const matches = rows.filter(row => row.proposed && row.predicted === family), expected = positive.filter(row => row.expected === family), tp = matches.filter(row => row.expected === family).length; return { family, expected: expected.length, proposed: matches.length, precision: ratio(tp, matches.length), recall: ratio(tp, expected.length) }; }),
    exactOem: { acceptedClaims: rows.filter(row => row.acceptedOem).length, precision: null, recall: null, reason: "Exact identity needs a separate labeled OEM test set; category labels cannot measure it." },
  };
}
