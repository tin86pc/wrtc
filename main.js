

var lastPeerId = null;
var peer = null; // own peer object
var conn = null;
var recvId = document.getElementById("my-id");
var copyButton = document.getElementById("copy-button");
var pasteButton = document.getElementById("paste-button");

var recvIdInput = document.getElementById("receiver-id");
var statu = document.getElementById("statu");
var message = document.getElementById("message");


var sendMessageBox = document.getElementById("sendMessageBox");
var sendButton = document.getElementById("sendButton");
var clearMsgsButton = document.getElementById("clearMsgsButton");
var connectButton = document.getElementById("connect-button");
var cueString = "<span class=\"cueMsg\">Cue: </span>";



/**
 * Create the Peer object for our end of the connection.
 *
 * Sets up callbacks that handle any events related to our
 * peer object.
 */


// lấy tham số từ url
const url = new URL(window.location.href);
const textQR = url.searchParams.get('id');
if (textQR != null) {
    console.log(textQR);
    recvIdInput.value = textQR;
}


fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        console.log(data.ip);
    })
    .catch(error => {
        console.log('Error:', error);
    });


function initialize() {
    // Create own peer object with connection to shared PeerJS server
    peer = new Peer(null, {
        debug: 2
    });

    peer.on('open', function (id) {
        // Workaround for peer.reconnect deleting previous id
        if (peer.id === null) {
            console.log('Received null id from peer open');
            peer.id = lastPeerId;
        } else {
            lastPeerId = peer.id;
        }

        const tqr = window.location.href + "?id=" + peer.id
        console.log(tqr);

        taoQRcode(tqr);

        recvId.textContent = "ID: " + peer.id;
        console.log('ID: ' + peer.id);
    });

    peer.on('connection', function (c) {

        if (conn && conn.open) {
            c.on('open', function () {
                c.send("Already connected to another client");
                setTimeout(function () { c.close(); }, 500);
            });
            return;
        }
        conn = c;
        statu.textContent = "Connected";
        ready();

    });

    peer.on('disconnected', function () {
        statu.textContent = "Connection lost. Please reconnect";
        console.log('Connection lost. Please reconnect');

        // Workaround for peer.reconnect deleting previous id
        peer.id = lastPeerId;
        peer._lastServerId = lastPeerId;
        peer.reconnect();
    });
    peer.on('close', function () {
        conn = null;
        statu.textContent = "Connection destroyed. Please refresh";
        console.log('Connection destroyed');
    });
    peer.on('error', function (err) {
        console.log(err);
        alert('' + err);
    });
};


function ready() {
    conn.on('data', function (data) {
        console.log("Data recieved");
        var cueString = "<span class=\"cueMsg\">Cue: </span>";
        switch (data) {
            case 'Go':
                addMessage(cueString + data);
                break;
            case 'Fade':
                addMessage(cueString + data);
                break;
            case 'Off':
                addMessage(cueString + data);
                break;
            case 'Reset':
                addMessage(cueString + data);
                break;
            default:
                addMessage("<span class=\"peerMsg\">Peer: </span>" + data);
                break;
        };
    });
    conn.on('close', function () {
        statu.textContent = "Connection reset<br>Awaiting connection...";
        conn = null;
    });
}

/**
 * Create the connection between the two Peers.
 *
 * Sets up callbacks that handle any events related to the
 * connection and data received on it.
 */
function join() {
    // Close old connection
    if (conn) {
        conn.close();
    }

    // Create connection to destination peer specified in the input field
    conn = peer.connect(recvIdInput.value, {
        reliable: true
    });

    conn.on('open', function () {
        statu.textContent = "Connected to: " + conn.peer;

        console.log("Connected to: " + conn.peer);

        // Check URL params for comamnds that should be sent immediately
        var command = getUrlParam("command");
        if (command)
            conn.send(command);
    });
    // Handle incoming data (messages only since this is the signal sender)
    conn.on('data', function (data) {
        addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
    });
    conn.on('close', function () {
        statu.textContent = "Connection closed";
    });
};

/**
 * Get first "GET style" parameter from href.
 * This enables delivering an initial command upon page load.
 *
 * Would have been easier to use location.hash.
 */
function getUrlParam(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null)
        return null;
    else
        return results[1];
};

/**
 * Send a signal via the peer connection and add it to the log.
 * This will only occur if the connection is still alive.
 */
function signal(sigName) {
    if (conn && conn.open) {
        conn.send(sigName);
        console.log(sigName + " signal sent");
        addMessage(cueString + sigName);
    } else {
        console.log('Connection is closed');
    }
}



function addMessage(msg) {
    var now = new Date();
    var h = now.getHours();
    var m = addZero(now.getMinutes());
    var s = addZero(now.getSeconds());

    if (h > 12)
        h -= 12;
    else if (h === 0)
        h = 12;

    function addZero(t) {
        if (t < 10)
            t = "0" + t;
        return t;
    };

    message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + message.innerHTML;
};

function clearMessages() {
    message.innerHTML = "";
    addMessage("Msgs cleared");
};

// Listen for enter in message box
sendMessageBox.addEventListener('keypress', function (e) {
    console.log(e);
    if (e.code == "Enter") {
        sendButton.click();
    }

});

document.addEventListener('keypress', function (e) {
    if (e.code == "Enter") {
        sendButton.click();
    }
});

// Send message
sendButton.addEventListener('click', function () {
    if (conn && conn.open) {
        var msg = sendMessageBox.value;
        if (msg != "") {
            sendMessageBox.value = "";
            conn.send(msg);
            console.log("Sent: " + msg);
            addMessage("<span class=\"selfMsg\">Self: </span> " + msg);
        }
        else {
            sendMessageBox.focus();
        }

    } else {
        console.log('Connection is closed');
        sendMessageBox.focus();
    }
});

// Clear messages box
clearMsgsButton.addEventListener('click', clearMessages);
// Start peer connection on click
connectButton.addEventListener('click', join);

copyButton.addEventListener('click', () => {
    var copyText = peer.id;

    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText)
        .then(() => {
            // Alert the copied text
            console.log("Copied the text: " + copyText);
        })
        .catch((error) => {
            // Handle error
            console.error(error);
        });
});


pasteButton.addEventListener('click', () => {
    navigator.clipboard.readText().then(text => recvIdInput.value = text);
});

function taoQRcode(nd) {
    var qrcode = new QRCode("qrcode", {
        text: nd,
        width: 100,
        height: 100,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Since all our callbacks are setup, start the process of obtaining an ID
initialize();
