# Approach

When resolving the reporting window, always exclude the current day because
later events lag earlier ones and create a false drop. Read the property
timezone from the response metadata rather than assuming UTC or the local
zone. State the resolved date range in the output header so it is auditable.
Snap comparison periods to ninety one days by default unless the user names a
different window explicitly.
