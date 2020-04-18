(() => {
  // quite a hack, but oh well
  'use strict'

  const DEBUGGING = false

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
   * Adds a new timestamp.
   * @param {string} videoId YouTube video ID.
   * @param {number} timestamp Time in seconds.
   */
  async function addTimestamp(videoId, timestamp) {
    let moment
    try {
      moment = await getMoment(videoId)
    } catch (exception) {
      debug(`Failed to retrieve a moment at addTimestamp: ${exception.message}`)
      throw exception
    }
    moment.t.push(timestamp)

    try {
      await setMoment(videoId, moment)
      showMoment(moment)
    } catch (exception) {
      debug(`Failed to set a new moment at addTimestamp: ${exception.message}`)
      throw exception
    }
  }

  /**
   * Removes an existing timestamp.
   * @param {string} videoId YouTube video ID.
   * @param {number} timestampIndex Indexf of timestamp to remove.
   */
  async function removeTimestamp(videoId, timestampIndex) {
    debug(`removeTimestamp: ${videoId}, ${timestampIndex}`)
    let moment
    try {
      moment = await getMoment(videoId)
    } catch (exception) {
      debug(`Failed to retrieve moment at removeTimestamp: ${exception.message}`)
      throw exception
    }
    debug(`moment: ${JSON.stringify(moment)}`)

    const newTimestamps = []
    for (let index = 0; index < moment.t.length; index++) {
      if (index == timestampIndex) {
        continue
      }
      newTimestamps.push(moment.t[index])
    }
    moment.t = newTimestamps

    debug(`new tiemstamps: ${JSON.stringify(newTimestamps)}`)

    try {
      await setMoment(videoId, moment)
      showMoment(moment)
    } catch (exception) {
      debug(`Failed to set a new moment at removeTimestamp: ${exception.message}`)
    }
  }

  /**
   * Sets a moment for a given YouTube video.
   * @param {string} videoId YouTube video ID.
   * @param {!Object} moment Moment object.
   */
  async function setMoment(videoId, moment) {
    const newData = {
      [videoId]: JSON.stringify(moment),
    }

    debug(`storing data: ${JSON.stringify(newData)}`)

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(newData, () => {
        debug(`result: ${chrome.runtime.lastError}`)

        if (chrome.runtime.lastError) {
          const error = new Error(
              `Failed to set a moment: v=${videoId}, ` +
              `m=${JSON.stringify(moment)}`)
          reject(error)
          return
        }

        resolve()
        return
      })
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

    const textArea = document.getElementById('debug-console')
    textArea.setAttribute('style', 'display: block')

    textArea.value += `\n${message}`
  }

  /**
   * Handles an event generated when a timestamp button is clicked.
   */
  async function timestampAddButtonClicked() {
    const timestampField = document.getElementById('new-moment-timestamp')
    const timestampRaw = timestampField.value
    debug(`timestampRaw: ${timestampRaw}`)

    // put this part as its own validation function
    let timestamp = 0
    try {
      timestamp = parseInt(timestampRaw)
    } catch (exception) {
      debug(`Failed to parseInt: ${exception.message}`)
    }

    if (isNaN(timestamp)) {
      return
    }

    if (timestamp < 0) {
      timestamp = 0
    }
    debug(`timestamp: ${timestamp}`)

    try {
      const videoId = await getVideoId()
      await addTimestamp(videoId, timestamp)
      timestampField.value = ''
    } catch (exception) {
      debug(`Failed to add a new moment: ${exception.message}`)
      throw exception
    }
  }

  /**
   * Initializes the popup page.
   */
  function initializePage() {
    const button = document.getElementById('new-moment-add-button')
    button.addEventListener('click', () => {
      timestampAddButtonClicked()
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
      link.setAttribute('class', 'timestamp-seconds')
      link.setAttribute('href', '#')
      link.dataset.timestamp = timestamp
      link.onclick = timestampClicked
      link.innerHTML = `${timestamp}`

      const linkContainer = document.createElement('div')
      linkContainer.setAttribute('class', 'timestamp-seconds-container')
      linkContainer.appendChild(link)

      const remove = document.createElement('a')
      remove.setAttribute('class', 'timestamp-remove')
      remove.setAttribute('href', '#')
      remove.dataset.timestampIndex = index
      remove.onclick = timestampRemoveClicked
      remove.innerHTML = 'X'

      const removeContainer = document.createElement('div')
      removeContainer.setAttribute('class', 'timestamp-remove-container')
      removeContainer.appendChild(remove)

      const listItem = document.createElement('li')
      listItem.appendChild(linkContainer)
      listItem.appendChild(removeContainer)

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

  /**
   * Handles an event generated when a timestamp remove is clicked.
   * @param {!Object} event Event.
   */
  async function timestampRemoveClicked(event) {
    debug(`remove clicked: ${event.target.dataset.timestampIndex}`)

    const index = event.target.dataset.timestampIndex
    try {
      const videoId = await getVideoId()
      await removeTimestamp(videoId, index)
    } catch (exception) {
      debug(`Failed to remove timestamp: ${index}`)
    }
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
