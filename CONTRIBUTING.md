# Contributing

Thanks for your interest in showsite. The project is in early development, so
the most useful contributions right now are bug reports with a small show
folder that reproduces the problem, and feedback on the content format.

## Getting set up

You need Node.js 22 or newer.

```sh
npm ci
npm run lint
npm test
npm run build
```

`npm run demo` builds the generator and then the demo show into `_site/`.

## Making a change

1. Open an issue first for anything larger than a small fix, so we can agree
   on the approach.
2. Keep changes focused. One topic per pull request.
3. Add or update tests. Anything that changes the feed should have a test that
   parses the feed and checks the tags involved.
4. Update `docs/content-format.md` when you add or change a field, and add a
   line under "Unreleased" in `CHANGELOG.md`.
5. Make sure `npm run lint`, `npm test` and `npm run build` pass.

## Guidelines

- Runtime dependencies must be MIT, ISC or BSD licensed, and few. Explain any
  new one in the pull request. Writing a small function is often better than
  adding a package.
- Builds must be reproducible: the same show folder must produce the same
  output. Do not use the current time or random values in output.
- Content errors should be reported as `ShowsiteError` with a message that
  names the file and the field.
- Test fixtures use invented shows, people and `example.com` URLs only. Do
  not add real podcasts, real people or third-party media.
- Significant design choices get a short record in `docs/decisions/`.

## Reporting a security issue

If you find a problem that could put users or their sites at risk, please
report it privately through the repository's Security tab ("Report a
vulnerability") instead of opening a public issue.

## License

By contributing, you agree that your contributions are licensed under the MIT
License in [LICENSE](LICENSE).
