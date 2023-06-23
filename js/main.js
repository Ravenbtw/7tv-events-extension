const elements = {
  extensionContainer: document.querySelector('.extension-container'),
  headerText: document.querySelector('.header-text'),
  eventImage: document.querySelector('.event-image'),
  eventName: document.querySelector('.event-name'),
};

let hasConnectedToEventApi = false;

const eventQueue = [];

const emoteImages = {};

setInterval(() => {
  const eventQueueItem = eventQueue[0];

  if (!eventQueueItem) return;

  elements.headerText.innerText = eventQueueItem.added
    ? 'Emote Added'
    : 'Emote Removed';

  elements.eventImage.src =
    eventQueueItem.image || emoteImages[eventQueueItem.id];
  elements.eventImage.alt = eventQueueItem.name;

  elements.eventName.innerText = eventQueueItem.name;

  eventQueue.shift();

  setTimeout(() => {
    elements.extensionContainer.style.opacity = 1;

    elements.extensionContainer.style.pointerEvents = 'auto';
  }, 1000);

  setTimeout(() => {
    elements.extensionContainer.style.opacity = 0;

    setTimeout(
      () => (elements.extensionContainer.style.pointerEvents = 'none'),
      1000
    );
  }, 1000 * 6);
}, 1000 * 7);

const getChannel = async (channelId) => {
  try {
    if (hasConnectedToEventApi) {
      return;
    } else {
      hasConnectedToEventApi = true;
    }

    const { emote_set } = await (
      await fetch(`https://7tv.io/v3/users/twitch/${channelId}`)
    ).json();

    for (const emote of emote_set.emotes)
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
            condition: { object_id: emote_set.id },
          },
        })
      );
  } catch (error) {
    console.log(error);
  }
};

Twitch.ext.onAuthorized((auth) => getChannel(auth.channelId));
