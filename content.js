// Chrome's match pattern syntax cannot express "bamboo anywhere in URL",
// so we match all http/https and bail early if bamboo isn't in the URL.
if (!window.location.href.includes('bamboo')) {
    // Not a Bamboo page — do nothing.
    throw new Error('bamboo-notifier: not a Bamboo page, skipping');
}

let chimeEnabled = false;
let observer = null;
let uiElement = null;
let audioCtx = null;

function note(frequency) {
    console.log(`playing a note: ${frequency}`);
    if (!audioCtx || audioCtx.state === 'closed') return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = frequency;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // attack
    gain.gain.linearRampToValueAtTime(0, now + 0.49); // release

    osc.start(now);
    osc.stop(now + 0.5);
}

function chord() {
    note(500);
    note(600);
    note(800);
}

function triggerAlert() {
    if (chimeEnabled) {
        chord();
    }
}

function positionUI(anchor) {
    if (!uiElement || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    uiElement.style.top = (rect.top - 12) + 'px';
    uiElement.style.left = rect.left + 'px';
}

function createUI(anchor) {
    if (uiElement) return;

    uiElement = document.createElement('div');
    uiElement.id = 'bamboo-chime-ui';
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

    const text = document.createTextNode('Chime: ');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;
    checkbox.style.cssText = 'cursor: pointer;';

    checkbox.addEventListener('change', () => {
        chimeEnabled = checkbox.checked;
        if (chimeEnabled && (!audioCtx || audioCtx.state === 'closed')) {
            audioCtx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
        }
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

function setupObserver(statusElement) {
    stopObserver();

    observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            // Class change on the status element itself
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

            // Status element (or an ancestor containing it) was removed from the DOM
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

    // Watch the full subtree above the status element so we catch removals at
    // any level between the element and the document root.
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

function init() {
    const statusElement = document.querySelector(
        '#status-ribbon .status-ribbon-status.InProgress'
    );

    if (!statusElement) return;

    createUI(statusElement);
    setupObserver(statusElement);

    window.addEventListener('beforeunload', () => {
        // Only alert if we're still actively monitoring an in-progress build/deploy.
        if (observer) {
            triggerAlert();
        }
    });
}

init();
