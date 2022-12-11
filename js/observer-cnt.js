// Start listening for messages from the background service
// worker.  Any interaction with the remote repository is
// handled, in an async manner, through the background services.

var observer_patterns = undefined;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        // listen for messages sent from background.js
        if (request.sender && request.sender === 'workday') {
            // A patterns message is the reply from the get patterns
            // request sent when the content was first injected.

            if (request.message && request.message === 'patterns') {
                observer_patterns = request.patterns;
            }
        }
    });

// Ask for the patterns we use to identify pages and elements on
// pages.  These will drive the messages generated as events.  We
// start looking for the identity of the page when the search
// patterns are returned as a message to our listener.

chrome.runtime.sendMessage({ "action": "patterns" });

// Utility function to wait for an element we want to observer
// that has not yet been rendered in the page.  The trick here
// is to observer the entire document until our target element
// exists - then stop observing.

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

// Utility function to locate a value from the page
// to insert into an event message.

function gettokenValue(pattern, match) {
    // Did we actually get a pattern?
    if (!pattern) {
        return "Invalid pattern in gettokenValue";
    }

    // Is there a format defined in the pattern?
    if (!pattern.contents) {
        return "Missing contents in gettokenValue";
    }

    // Do we have a format specification to build our return string?
    if (!pattern.contents.format) {
        return "Missing format specifier";
    }

    var format = pattern.contents.format;
    var tokens = pattern.contents.tokens; // List of token objects

    // If there are no subsitition tokens defined simply
    // return the format defintion string.  There may be
    // tags (#tag) values in the string, but we have no
    // substitutions, so no reason to look.

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
            // The target value is NOT a child of the matched
            // element, search the entire page.
            item = document.querySelector(token.content)
        } else if (token.type === "local") {
            if (token.content) {
                // The target value is a child of the matched
                // element, search only from this token's
                // child elements.

                item = match.querySelector(token.content);
            } else {
                // Neither
                item = match;
            }
        }

        // Apply 
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

// Handle all changes we are observing.
const observer = new MutationObserver(mutations => {
    mutations.forEach((mutation) => {
        // It is possible that page mutations happen BEFORE we
        // get the patterns back from the server.  If we don't
        // have our patterns, simply skip this set of mutations.

        if (observer_patterns !== undefined) {
            if (mutation.type === "childList") {
                // We are only looking for changes to the DOM - changes
                // to attributes are ignored.

                for (let observer_pattern in observer_patterns) {
                    // Loop over the patterns retrieved from the server and
                    // see if any of the mutations match.

                    let pattern = observer_patterns[observer_pattern];

                    // Is the pattern present?
                    let match = mutation.target.querySelector(pattern.selector);

                    if (match) {
                        // Generate the message we need to send with the event.
                        let token = gettokenValue(pattern, match);

                        // Since a mutation may include our pattern multiple times,
                        // i.e., multiple mutations that include us, only send an
                        // event if the event message value changes.

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

// Start watching for mutations.  NOTE: we are watching the
// entire DOM for changes.

observer.observe(document, {
    childList: true,
    subtree: true
});