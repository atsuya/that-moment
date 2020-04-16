(() => {
  // quite a hack, but oh well
  'use strict'

  const DEBUGGING = true

  const EMPTY_MOMENT = {
    t: [],
  }

  /**
   * Retrieves a YouTube video ID from the active tab.
   * @return {string} YouTube video ID.
   */
  async function getVideoId() {
    try {
      const activeTab = await getActiveTab()
      const url = activeTab.url

      const searchParams = (new URL(url)).searchParams
      return searchParams.get('v')
    } catch (exception) {
      debug(`Failed to retrieve video id: ${exception.message}`)
      throw exception
    }
  }

  /**
   * Retrieves an active tab.
   * @return {!Object} Tab object.
   */
  function getActiveTab() {
    const queryInfo = {
      active: true,
      lastFocusedWindow: true,
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        if (tabs.length === 1) {
          resolve(tabs[0])
          return
        }

        reject(new Error('Failed to retrieve an active tab'))
        return
      })
    })
  }

  /**
   * Adds a new moment.
   * @param {string} videoId YouTube video ID.
   * @param {number} timestamp Time in seconds.
   */
  async function addMoment(videoId, timestamp) {
    const moment = await getMoment(videoId)
    moment.t.push(timestamp)

    const newData = {
      [videoId]: JSON.stringify(moment),
    }
    debug(`storing data: ${JSON.stringify(newData)}`)

    chrome.storage.sync.set(newData, () => {
      debug(`result: ${chrome.runtime.lastError}`)
    })
  }

  /**
   * Retrieves a moment for a given YouTube video.
   * @param {string} videoId YouTube video ID.
   * @return {!Object} Moment.
   */
  function getMoment(videoId) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get({ [videoId]: null }, (items) => {
        const moment = items[videoId]
        if (moment === null) {
          debug(`no data for ${videoId}`)

          resolve(EMPTY_MOMENT)
          return
        }

        resolve(JSON.parse(moment))
        return
      })
    })
  }

  /**
   * Logs debug messages.
   * @param {string} message Message.
   */
  function debug(message) {
    if (!DEBUGGING) {
      return
    }

    let textArea = document.getElementById('debug')
    if (!textArea) {
      textArea = document.createElement('textarea')
      textArea.setAttribute('id', 'debug')
      textArea.setAttribute('cols', '80')
      textArea.setAttribute('rows', '10')
      document.body.appendChild(textArea)
    }

    textArea.value += `\n${message}`
  }

  /**
   * Initializes the popup page.
   */
  function initializePage() {
    const button = document.getElementById('new-moment-add')
    button.addEventListener('click', async () => {
      try {
        const videoId = await getVideoId()

        const timestampField = document.getElementById('new-moment-timestamp')
        const timestampRaw = timestampField.value

        // put this part as its own validation function
        let timestamp = 0
        try {
          timestamp = parseInt(timestampRaw)
        } catch (exception) {
          debug(`Failed to parseInt: ${exception.message}`)
        }
        if (timestamp < 0) {
          timestamp = 0
        }

        await addMoment(videoId, timestamp)
      } catch (exception) {
        debug(`Failed to add a new moment: ${exception.message}`)
        throw exception
      }
    })
  }

  /**
   * Shows moments for a given YouTube video.
   * @param {!Object} moment An object containing all moments for a YouTube
   *     video.
   */
  function showMoment(moment) {
    const momentList = document.getElementById('moment-list')
    while (momentList.firstChild) {
      momentList.removeChild(momentList.lastChild)
    }

    const timestamps = moment.t
    for (let index = 0; index < timestamps.length; index++) {
      const timestamp = timestamps[index]

      const link = document.createElement('a')
      link.setAttribute('href', '#')
      link.dataset.timestamp = timestamp
      link.onclick = timestampClicked
      link.innerHTML = `${timestamp}`

      const listItem = document.createElement('li')
      listItem.appendChild(link)

      momentList.appendChild(listItem)
    }
  }

  /**
   * Handles an event generated when a timestamp is clicked.
   * @param {!Object} event Event.
   */
  function timestampClicked(event) {
    const timestamp = event.target.dataset.timestamp
    // make sure to validate that the timestamp is integer
    debug(`timestampClicked: ${timestamp}`)

    chrome.tabs.executeScript(
        {
          code: `window.location = "#t=${timestamp}";`,
        },
        () => {
          debug('done executing')
        })
  }

  window.addEventListener('DOMContentLoaded', async () => {
    initializePage()

    try {
      const videoId = await getVideoId()
      const moment = await getMoment(videoId)
      showMoment(moment)
    } catch (exception) {
      debug(`Failed to show a moment: ${exception.message}`)
    }

    if (DEBUGGING) {
      //chrome.storage.sync.clear(() => {
      //  debug('cleared all data')
      //})
      chrome.storage.sync.get(null, (items) => {
        debug(`all stored data: ${JSON.stringify(items)}`)
      })
    }
  })
})()
