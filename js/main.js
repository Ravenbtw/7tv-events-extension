const elements = {
  extensionContainer: document.querySelector('.extension-container'),
  event: document.querySelector('.event'),
  eventAction: document.querySelector('.event-action'),
  eventImage: document.querySelector('.event-image'),
  eventName: document.querySelector('.event-name'),
};

let hasConnectedToEventApi = false;

const eventQueue = [];

const emoteImages = {};

setInterval(() => {
  const eventQueueItem = eventQueue[0];

  if (!eventQueueItem) return;

  elements.event.href = `https://7tv.app/emotes/${eventQueueItem.id}`;

  elements.eventAction.innerText = eventQueueItem.added
    ? 'Emote Added'
    : 'Emote Removed';

  elements.eventImage.src =
    eventQueueItem.image || emoteImages[eventQueueItem.id];

  elements.eventName.innerText = eventQueueItem.name;

  eventQueue.shift();

  setTimeout(() => {
    elements.extensionContainer.style.opacity = 1;
    elements.extensionContainer.style.pointerEvents = 'auto';

    setTimeout(() => {
      elements.extensionContainer.style.opacity = null;

      setTimeout(
        () => (elements.extensionContainer.style.pointerEvents = null),
        1000
      );
    }, 1000 * 5);
  }, 1000);
}, 1000 * 7);

Twitch.ext.onAuthorized(async (auth) => {
  if (hasConnectedToEventApi) return;

  hasConnectedToEventApi = true;

  const emoteSet = (
    await (
      await fetch(`https://7tv.io/v3/users/twitch/${auth.channelId}`)
    ).json()
  ).emote_set;

  for (const emote of emoteSet.emotes)
    emoteImages[emote.id] = `https:${emote.data.host.url}/${
      emote.data.host.files[emote.data.host.files.length - 1].name
    }`;

  const eventApi = new WebSocket('wss://events.7tv.io/v3');

  eventApi.onmessage = (event) => {
    const body = JSON.parse(event.data).d.body;

    if (body?.pulled?.length)
      for (const { old_value } of body.pulled)
        eventQueue.push({ id: old_value.id, name: old_value.name });

    if (body?.pushed?.length)
      for (const { value } of body.pushed) {
        eventQueue.push({
          added: true,
          id: value.id,
          name: value.name,
          image: `https:${value.data.host.url}/${
            value.data.host.files[value.data.host.files.length - 1].name
          }`,
        });

        emoteImages[value.id] = `https:${value.data.host.url}/${
          value.data.host.files[value.data.host.files.length - 1].name
        }`;
      }
  };

  eventApi.onopen = () =>
    eventApi.send(
      JSON.stringify({
        op: 35,
        d: {
          type: 'emote_set.update',
          condition: { object_id: emoteSet.id },
        },
      })
    );
});
