# -*- coding: utf-8 -*-
"""train_query_classifier.py

Segédskript a QueryClassifier ML-modell (TF-IDF + LinearSVC) betanításához.

Használat (fejlesztői gépen vagy CI runneren):

```bash
python -m modules.financehub.backend.core.chat.train_query_classifier \
       --input data/query_training_corpus.tsv \
       --output modules/financehub/backend/core/chat/query_classifier_model.joblib
```

A bemeneti TSV első oszlopa a `label` (greeting / indicator / summary / news / hybrid / unknown),
a második oszlopa a `text` (felhasználói példa kérdés).  Ha nincs `--input`,
a script generál egy minimális beépített korpuszt (hard-coded példák), hogy
azonnal használható joblib jöjjön létre.
"""

from __future__ import annotations

import argparse
import pathlib
import sys
from typing import List, Tuple

import joblib  # type: ignore
from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
from sklearn.svm import LinearSVC  # type: ignore
from sklearn.pipeline import Pipeline  # type: ignore
from sklearn.model_selection import train_test_split, cross_val_score  # type: ignore
from sklearn.metrics import classification_report  # type: ignore


DEFAULT_CORPUS: List[Tuple[str, str]] = [
    ("greeting", "hi there"),
    ("greeting", "szia finbot"),
    ("greeting", "hello assistant"),
    ("indicator", "show me the RSI for AAPL"),
    ("indicator", "price chart of tesla please"),
    ("indicator", "mutasd az árfolyam momentumot"),
    ("summary", "why did the stock fall today"),
    ("summary", "analysis of msft performance"),
    ("summary", "miért esik az ár"),
    ("news", "latest news about nvda"),
    ("news", "hírek az OTP részvényről"),
    ("news", "breaking headline for google stock"),
    ("hybrid", "price and news summary for amd"),
]


def load_corpus(path: pathlib.Path | None) -> Tuple[List[str], List[str]]:
    texts: List[str] = []
    labels: List[str] = []
    if path and path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            parts = line.split("\t", 1)
            if len(parts) != 2:
                continue
            labels.append(parts[0].strip())
            texts.append(parts[1].strip())
    else:
        for lbl, txt in DEFAULT_CORPUS:
            labels.append(lbl)
            texts.append(txt)
    return texts, labels


def main() -> None:
    parser = argparse.ArgumentParser(description="Train QueryClassifier TF-IDF model")
    parser.add_argument("--input", type=str, help="Path to TSV corpus (label \t text)")
    parser.add_argument("--output", type=str, required=True, help="Where to save the joblib model")
    args = parser.parse_args()

    input_path = pathlib.Path(args.input) if args.input else None
    texts, labels = load_corpus(input_path)

    pipeline: Pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_df=0.9, lowercase=True)),
        ("clf", LinearSVC()),
    ])

    X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42, stratify=labels)
    pipeline.fit(X_train, y_train)

    if X_test:
        y_pred = pipeline.predict(X_test)
        print(classification_report(y_test, y_pred))
        cv_acc = cross_val_score(pipeline, texts, labels, cv=3).mean()
        print(f"Cross-val accuracy: {cv_acc:.3f}")

    # Mentés
    output_path = pathlib.Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump((pipeline.named_steps["tfidf"], pipeline.named_steps["clf"]), output_path)
    print(f"Model saved to {output_path}")


if __name__ == "__main__":
    sys.exit(main()) 