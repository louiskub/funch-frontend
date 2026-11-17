export function instantInZone(value: string, zone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Enter a valid pickup and return time.');
  const target = match.slice(1).map(Number);
  const targetUtc = Date.UTC(
    target[0],
    target[1] - 1,
    target[2],
    target[3],
    target[4],
  );
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let guess = targetUtc;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      format
        .formatToParts(new Date(guess))
        .map((part) => [part.type, Number(part.value)]),
    );
    const rendered = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    guess += targetUtc - rendered;
  }
  const check = Object.fromEntries(
    format
      .formatToParts(new Date(guess))
      .map((part) => [part.type, part.value]),
  );
  if (
    `${check.year}-${check.month}-${check.day}T${check.hour}:${check.minute}` !==
    value
  )
    throw new Error('That local time does not exist in the branch timezone.');
  return new Date(guess).toISOString();
}

export function localDateTimeInZone(value: string, zone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatDateTimeInZone(
  value: string,
  zone: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
