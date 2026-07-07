# motto/no-broken-relative-links

Flag relative links and images in the body whose target does not exist on disk, relative to the skill's directory.

Skills rely on referenced files for progressive disclosure. A dead relative link means the agent will try to open something that isn't there. Absolute URLs (`https:`, `mailto:`, `//host`) and pure anchors (`#section`) are ignored; URL fragments and query strings are stripped before the file is resolved.

This is the only rule that touches the filesystem (`node:fs`), and it is a no-op when the file has no resolvable path.

## Fails

```md
See [the guide](./missing.md).
![diagram](./assets/gone.png)
```

## Passes

```md
See [the guide](./reference.md).
[external](https://example.com) and [jump](#steps).
```

## Options

None.
