/**
 * Licensed under MIT
 * (https://github.com/atsuya/that-moment/blob/master/LICENSE)
 */
'use strict'

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              schemes: ['https'],
              hostEquals: 'www.youtube.com',
              pathEquals: '/watch',
            },
          }),
        ],
        actions: [
          new chrome.declarativeContent.ShowPageAction(),
        ],
      },
    ])
  })
})
