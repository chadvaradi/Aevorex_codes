import pytest

from modules.financehub.backend.core.chat.query_classifier import QueryClassifier, QueryType

# -----------------------------------------------------------------------------
# PyTest fixtures
# -----------------------------------------------------------------------------
@pytest.fixture(scope="module")
def classifier():
    """Shared QueryClassifier instance for the entire test module."""
    return QueryClassifier()

# -----------------------------------------------------------------------------
# Happy-path classification tests
# -----------------------------------------------------------------------------
@pytest.mark.parametrize(
    "text,expected_type",
    [
        ("Hello there!", QueryType.greeting),
        ("Give me a short summary of AAPL", QueryType.summary),
        ("What's the RSI of TSLA?", QueryType.indicator),
        ("Latest news about NVDA", QueryType.news),
        (
            "Explain how Apple's iPhone revenue impacts its current valuation in the next decade",  # noqa: E501
            QueryType.hybrid,
        ),
    ],
)
def test_basic_classification(classifier, text, expected_type):
    """Validate that typical inputs map to the expected QueryType."""
    q_type, _lang, is_valid = classifier.classify(text)
    assert is_valid is True
    assert q_type == expected_type


# -----------------------------------------------------------------------------
# Edge-case tests
# -----------------------------------------------------------------------------
@pytest.mark.parametrize("short_text", ["AAPL", "Hi", "42"])
def test_too_short_inputs(classifier, short_text):
    """Texts shorter than 5 characters should be marked invalid but return a q_type."""
    q_type, _lang, is_valid = classifier.classify(short_text)
    assert is_valid is False
    assert isinstance(q_type, QueryType) 