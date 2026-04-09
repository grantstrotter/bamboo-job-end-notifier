const notificationTabs = {};

async function ensureOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play alert sound when a Bamboo job ends'
    });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'SHOW_NOTIFICATION') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon128.png'),
            title: msg.payload.title,
            message: msg.payload.message
        }, (id) => {
            if (sender.tab) {
                notificationTabs[id] = { tabId: sender.tab.id, windowId: sender.tab.windowId };
            }
        });
    }

    if (msg.type === 'PLAY_ALERT') {
        ensureOffscreenDocument().then(() => {
            chrome.runtime.sendMessage({ type: 'PLAY_ALERT' });
        });
    }
});

chrome.notifications.onClicked.addListener((notificationId) => {
    const info = notificationTabs[notificationId];
    if (info) {
        chrome.windows.update(info.windowId, { focused: true });
        chrome.tabs.update(info.tabId, { active: true });
        delete notificationTabs[notificationId];
    }
    chrome.notifications.clear(notificationId);
});
