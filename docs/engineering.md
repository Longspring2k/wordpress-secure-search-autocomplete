# Engineering decisions

Secure WordPress Search Autocomplete

## Remote search is not publication authority

Use remote identifiers for retrieval, but let the local content system decide what can be displayed.

## Latest query wins

Combine cancellation with sequence checks because canceling a request alone does not define response ordering.

## Fail closed

Missing or mismatched configuration should not silently select an unintended search target.

## Reading the architecture

Search input → Bounded server adapter → External search identifiers → Local visibility and URL checks → Keyboard-ready results

The diagram reduces the implementation to its relevant responsibilities. It does not expose private endpoints, exact deployment layout, resource identifiers or operational configuration.
