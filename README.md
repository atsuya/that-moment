# that moment

A Chrome extension that remembers specific moments of YouTube videos you keep coming back to.


# How it works

It employs [Background Scripts](https://developer.chrome.com/extensions/background_pages) to trigger [Page Actions](https://developer.chrome.com/extensions/pageAction) only when a user visits a YouTube watch page.

When Page Action is triggered, it uses [Storage API](https://developer.chrome.com/extensions/storage) to retrieve and store timestamps that you enter for a specific YouTube video. It uses `storage.sync` so the timestamps should be synced across Chrome that you signed in.


# Need improvements

## Better UX

When Page Action is triggered, it should automatically grab the current timestamp from the YouTube watch page. The timestamp grabbed can be pre-populated for a user to store the timestamp.

## Better UI

I'm not an artist by any mean, obviously. When a lot of timestamps are stored for a YouTube video, the list of the timestamps simply grows. Nothing is done to accommodate the situation currently.

## Simplify code

The code is very messy at the moment. Given what needs to be done became a bit more clear, I think a bunch of functions can be simplifies to some simple classes and methods.
