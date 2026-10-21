/** An error in the user's show content or options. The CLI prints these without a stack trace. */
export class ShowsiteError extends Error {
  constructor(
    message: string,
    readonly problems: string[] = [],
  ) {
    super(problems.length > 0 ? `${message}\n${problems.map((p) => `  - ${p}`).join("\n")}` : message);
    this.name = "ShowsiteError";
  }
}
