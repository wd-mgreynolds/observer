// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function (details) {
    var thisVersion = chrome.runtime.getManifest().version;

    if (details.reason == 'install') {
        console.log('This is a first install!');
    } else if (details.reason == 'update') {
        console.log('Updated from ' + details.previousVersion + ' to ' + thisVersion + '!');
    }
});

chrome.runtime.onStartup.addListener(function (event) {
    var thisVersion = chrome.runtime.getManifest().version;
    console.log("running startup event");
});

// Listen for requests from the content script.

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action) {
            if (request.action === "patterns") {
                getPatterns(sender.tab.id);
            } else if (request.action === "event") {
                sendEvent(request)
            }
        }
    }
);

// Lookup the available page identification patterns
// and return them to the content script.
function getPatterns(tab) {
    chrome.storage.sync.get('wddw_server', function (item) {
        var endpoint = 'https://' + (item.wddw_server || 'sizingtool.us') + '/patterns';

        fetch(endpoint)
            .then((response) => response.json())
            .then((data) => {
                chrome.tabs.sendMessage(tab, {
                    "sender": "workday",
                    "message": "patterns",
                    "patterns": data
                });
            });
    });
}

function sendEvent(eventData, options) {
    chrome.storage.sync.get(['wddw_server', 'wddw_workmate'], function (items) {
        eventData.workmate = items.wddw_workmate || 'first.last';;

        var endpoint = 'https://' + (items.wddw_server || 'sizingtool.us') + '/event';

        fetch(endpoint, {
            method: 'POST',
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify(eventData)
        }).catch(function (error) {
            console.log('Request failed', error);
        });
    });
}
