(function () {
    // Chrome's match pattern syntax cannot express "bamboo anywhere in URL",
    // so we match all http/https and bail early if bamboo isn't in the URL.
    if (!window.location.href.includes('bamboo')) { return; }

    let alertEnabled = false;
    let observer = null;
    let uiElement = null;
    let programmaticNavigate = false;

    function runtimeSend(msg) {
        if (chrome.runtime) {
            chrome.runtime.sendMessage(msg);
        }
    }

    function sendChromeNotification() {
        runtimeSend({
            type: 'SHOW_NOTIFICATION',
            payload: {
                title: 'Bamboo Job Ended',
                message: 'Click here to return to it'
            }
        });
    }

    function triggerAlert() {
        if (alertEnabled) {
            runtimeSend({ type: 'PLAY_ALERT' });
            sendChromeNotification();
        }
    }

    function positionUI(anchor) {
        if (!uiElement || !anchor) return;
        const rect = anchor.getBoundingClientRect();
        uiElement.style.top = (rect.top + 19) + 'px';
        uiElement.style.left = (rect.left + 4) + 'px';
    }

    function createUI(anchor) {
        if (uiElement) return;

        uiElement = document.createElement('div');
        uiElement.id = 'bamboo-alert-ui';
        uiElement.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.72);
        color: #fff;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
        pointer-events: auto;
    `;

        const label = document.createElement('label');
        label.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        user-select: none;
    `;

        const text = document.createTextNode('Notify: ');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = false;
        checkbox.style.cssText = 'cursor: pointer;';

        chrome.storage.sync.get('alertEnabled', ({ alertEnabled: stored }) => {
            alertEnabled = !!stored;
            checkbox.checked = alertEnabled;
        });

        checkbox.addEventListener('change', () => {
            alertEnabled = checkbox.checked;
            chrome.storage.sync.set({ alertEnabled });
        });

        label.appendChild(text);
        label.appendChild(checkbox);
        uiElement.appendChild(label);
        document.body.appendChild(uiElement);

        positionUI(anchor);
    }

    function removeUI() {
        if (uiElement) {
            uiElement.remove();
            uiElement = null;
        }
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // --- Build flow ---
    // The .status-ribbon-status.InProgress element is stable for the duration of
    // the build. Alert as soon as it loses InProgress or is removed.

    function initBuild(statusElement) {
        setTimeout(() => createUI(statusElement, document.body), 250);

        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'class' &&
                    mutation.target === statusElement
                ) {
                    if (!statusElement.classList.contains('InProgress')) {
                        triggerAlert();
                        stopObserver();
                        removeUI();
                        return;
                    }
                }

                if (mutation.type === 'childList') {
                    for (const node of mutation.removedNodes) {
                        if (node === statusElement || node.contains(statusElement)) {
                            triggerAlert();
                            stopObserver();
                            removeUI();
                            return;
                        }
                    }
                }
            }
        });

        observer.observe(statusElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        window.addEventListener('beforeunload', () => {
            if (observer && programmaticNavigate) triggerAlert();
        });
    }

    // --- Deploy flow ---
    // The .status-ribbon-status.InProgress element is unstable — it may disappear
    // and reappear as the deploy progresses through steps. Alert only when it
    // disappears and no new one appears within a short window.

    function initDeploy(headerExtra) {
        setTimeout(() => createUI(headerExtra), 250);

        let pendingAlert = null;

        function scheduleAlert() {
            if (pendingAlert) return;
            pendingAlert = setTimeout(() => {
                pendingAlert = null;
                if (!document.querySelector('.status-ribbon-status.InProgress')) {
                    triggerAlert();
                    stopObserver();
                    removeUI();
                }
            }, 50);
        }

        function cancelAlert() {
            if (pendingAlert) {
                clearTimeout(pendingAlert);
                pendingAlert = null;
            }
        }

        observer = new MutationObserver(() => {
            if (document.querySelector('.status-ribbon-status.InProgress')) {
                cancelAlert();
            } else {
                scheduleAlert();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });

        window.addEventListener('beforeunload', () => {
            if (observer && programmaticNavigate) triggerAlert();
        });
    }

    // --- Entry point ---

    function init() {
        const statusElement = document.querySelector(
            '.status-ribbon-status.InProgress'
        );

        if (!statusElement) return;

        window.navigation.addEventListener('navigate', (e) => {
            if (!e.userInitiated) programmaticNavigate = true;
        });

        const headerExtra = document.querySelector('.bamboo-page-header-extra');
        if (headerExtra) {
            initDeploy(headerExtra);
        } else {
            initBuild(statusElement);
        }
    }

    init();
})();
