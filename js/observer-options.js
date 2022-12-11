/* globals chrome */

// Saves options to chrome.storage
function save_options() {
    var endpoint = document.getElementById('wdobserver_server').value;
    var workmate = document.getElementById('wdobserver_workmate').value;
    var demoMode = document.getElementById('wdobserver_mode').checked;

    chrome.storage.sync.set({
        wdobserver_workmate : workmate,
        wdobserver_server: endpoint,
        wdobserver_mode: demoMode
    }, function() {
        var status = document.getElementById('wdobserver_status');

        status.innerHTML = 'Options Saved.';

        setTimeout(function() {
            status.innerHTML = '';
            window.close();
        }, 1200);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    chrome.storage.sync.get('wdobserver_workmate', function(item) {
        document.getElementById('wdobserver_workmate').value = item.wdobserver_workmate || 'first.last';
    });

    chrome.storage.sync.get('wdobserver_server', function(item) {
        document.getElementById('wdobserver_server').value = item.wdobserver_server || 'https://k4gm22jz3pbysi7scemlhqhmje0hyuso.lambda-url.us-east-1.on.aws';
    });

    chrome.storage.sync.get('wdobserver_mode', function(mode) {
        document.getElementById('wdobserver_mode').checked = mode.wdobserver_mode;
    });
}

document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById('wdobserver_save').addEventListener('click', save_options);

function get_callback(items) {
    chrome.storage.local.clear();
}

function clear_cache() {
    chrome.storage.local.get(null, get_callback);

    setTimeout(function() {
        chrome.storage.local.clear();
        chrome.storage.local.get(null, get_callback);
    }, 500);
}

document.getElementById('clear_cache').addEventListener('click', clear_cache);
