let creatingOffscreenDocument = null;

async function ensureOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;
    if (creatingOffscreenDocument) {
        await creatingOffscreenDocument;
        return;
    }
    creatingOffscreenDocument = chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play alert sound when a Bamboo job ends'
    });
    await creatingOffscreenDocument;
    creatingOffscreenDocument = null;
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
                chrome.storage.session.set({
                    [id]: { tabId: sender.tab.id, windowId: sender.tab.windowId }
                });
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
    chrome.storage.session.get(notificationId, (result) => {
        const info = result[notificationId];
        if (info) {
            chrome.windows.update(info.windowId, { focused: true });
            chrome.tabs.update(info.tabId, { active: true });
            chrome.storage.session.remove(notificationId);
        }
    });
    chrome.notifications.clear(notificationId);
});
