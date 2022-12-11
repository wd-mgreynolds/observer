const regexp = /(?:#)(\w+)\b/g;

// Start listening to the background service worker.  Any
// interaction with the remote repository is handled, in
// an async manner, through the background services.

var wddw_patterns = undefined;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        // listen for messages sent from background.js
        if (request.sender && request.sender === 'workday') {
            if (request.message && request.message === 'patterns') {
                wddw_patterns = request.patterns;
            }
        }
    });

// Ask for the patterns we use to identify the classes of pages.  These
// will drive the content generated as events.  We start looking
// for the identity of the page when the search patterns are
// returned as a message.

chrome.runtime.sendMessage({ "action": "patterns" });

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

debugger;

function gettokenValue(pattern, match) {
    // Validate the pattern match for required values.

    // Did we actually get a pattern?
    if (!pattern) {
        return "Invalid pattern in gettokenValue";
    }

    // Is there a format defined in the pattern?
    if (!pattern.contents) {
        return "Missing contents in gettokenValue";
    }

    // Do we have a format specification to build our return?
    if (!pattern.contents.format) {
        return "Missing format specifier";
    }

    var format = pattern.contents.format;
    var tokens = pattern.contents.tokens;

    // If there are no subsitition tokens defined simply
    // return the format defintion string.

    if (!tokens || typeof tokens !== "object") {
        return format;
    }

    // Pull out the #tag (hashtag) strings from the format.
    var tagRE = /#(\w+)\b/gi;
    var tags = format.matchAll(tagRE);

    // Lookup the values for each tag.
    for(const tag of tags) {
        let token = tokens[tag[1]];
        let item;

        if (token.type === "document") {
            item = document.querySelector(token.content)
        } else if (token.type === "local") {
            if (token.content) {
                item = match.querySelector(token.content);
            } else {
                item = match;
            }
        }

        let tokenValue = "Missing eval function";

        if (token.eval === "value") {
            tokenValue = item.value;
        } else if (token.eval === "innerHTML") {
            tokenValue = item.innerHTML;
        }

        // Update the format string
        format = format.replaceAll(tag[0], tokenValue);
    };

    return format;
}

function generateEvent(pattern, tokenValue) {
    data = {
        "action": "event",
        "user": null,
        "url": window.location.href,
        "page": tokenValue,
        "payload": { "stuff": "stuff value" }
    }

    if (pattern.anonymous) {
        chrome.runtime.sendMessage(data);
    } else {
        // We should always be able to get the currently logged-in user, as shown in the
        // upper right of the current page.  We may need to wait until the page finishes
        // loading, so we create a quick observer to wait.

        let userTag = 'button[data-automation-id="Current_User"] img';

        waitForElm(userTag).then((user) => {
            data.user = user.alt;
            chrome.runtime.sendMessage(data);
        });
    }
}

const observer = new MutationObserver(mutations => {
    mutations.forEach((mutation) => {
        if (wddw_patterns !== undefined) {
            if (mutation.type === "childList") {
                for (let wddw_pattern in wddw_patterns) {
                    let pattern = wddw_patterns[wddw_pattern];

                    let match = mutation.target.querySelector(pattern.selector);

                    if (match) {
                        let token = gettokenValue(pattern, match);

                        if (pattern.lastValue !== token) {
                            pattern.lastValue = token;

                            generateEvent(pattern, token);
                        }
                    }

                }
            }
        }
    });
});

observer.observe(document, {
    childList: true,
    subtree: true
});