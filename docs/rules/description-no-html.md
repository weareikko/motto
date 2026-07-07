# motto/description-no-html

Disallow HTML/XML tags in the skill `description`.

Descriptions are consumed as plain routing text. Embedded tags such as `<b>` or `<role>` add noise and can interfere with how the description is parsed and displayed. Plain comparisons like `3 < 5` are fine — the rule only flags actual tags (`<` immediately followed by a letter or `/`).

## Fails

```yaml
description: Uses <b>bold</b> text. Use when needed.
description: Self-closing <br/> tag.
```

## Passes

```yaml
description: Compares values where 3 < 5. Use when needed.
```

## Options

None.
