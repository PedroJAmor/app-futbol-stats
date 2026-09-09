export function getMatchMentionTrigger(text: string) {
  const found = text.match(/(^|\s)@([a-zA-Z]*)(\d*)$/);
  if (!found || !"partido".startsWith(found[2].toLowerCase())) return null;

  const value = `@${found[2]}${found[3]}`;
  return {
    query: found[3],
    start: text.length - value.length,
  };
}

export function replaceMatchMentionTrigger(text: string, token: string) {
  const trigger = getMatchMentionTrigger(text);
  if (!trigger) return text;
  return `${text.slice(0, trigger.start)}${token}`;
}
