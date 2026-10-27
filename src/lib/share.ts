// Board links: the cards of a game in the URL's query string, e.g.
// `?players=4&kingdom=bridge,clerk,…&landscapes=baths&bane=moat`. The query string is
// dominion-setup's Board code as it is, which Python writes and reads, so `dominion-setup setup`
// can read any link.

/** Whether *params* are a Board link, and not e.g. an old link with a seed. */
export function isBoardLink(params: URLSearchParams): boolean {
  return params.has("kingdom");
}
