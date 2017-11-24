const NOTE_OFF = 128;
const NOTE_ON = 144;

var channelsInstruments = null;
var minNote = 48;
var maxNote = 62;

var  GeneralMidiNumber = 0;
var  GeneralMidiInstrument = 'acoustic_grand_piano';

// Handling MIDI file
var midiFile;

//var pathView = 'explode';

function noteOnStream(note){
    console.log("noteonstream");
    
    MIDI.programChange(0, GeneralMidiNumber);
    MIDI.setVolume(0, 127);
    MIDI.noteOn(0, note, 127, 0);
}

function noteOffStream(note){
    MIDI.noteOff(0, note, 0 );
}

function initListener() {
    MIDI.Player.addListener(
        function (data) {
            if (data.message == NOTE_ON) {
                // works for file
                // but not for keyboard
                addBall(data.note, data.velocity);
            }
        }
    );
}


function initkeyListeners() {
    // play the note
    window.addEventListener("keydown", function(event) {
        mapKey(event);


        MIDI.programChange(0, GeneralMidiInstrument);
        MIDI.setVolume(0, 127);


        event.preventDefault();
        console.log("addEventListener down", event);

        var note = 0;
        switch (event.code) {
            case "KeyA":
                note = 48; // C3
                break;
            case "KeyW":
                note = 49; // C#3
                break;
            case "KeyS":
                note = 50; // D3
                break;
            case "KeyE":
                note = 51; // D#3
                break;
            case "KeyD":
                note = 52; // E3
                break;
            case "KeyF":
                note = 53; // F3
                break;
            case "KeyT":
                note = 54; // F#3
                break;
            case "KeyG":
                note = 55; // G3
                break;
            case "KeyY":
                note = 56; // G#3
                break;
            case "KeyH":
                note = 57; // A3
                break;
            case "KeyU":
                note = 58; // A#3
                break;
            case "KeyJ":
                note = 59; // B3
                break;
            case "KeyK":
                note = 60; // C4
                break;
            case "KeyO":
                note = 61; // C#4
                break;
            case "KeyL":
                note = 62; // D4
                break;
            default:
                break;
        }


        noteOnStream(note);


    });

    window.addEventListener("keyup", function(event) {
        event.preventDefault();
        console.log("addEventListener up", event);

        var note = 0;
        switch (event.code) {
            case "KeyA":
                note = 48; // C3
                break;
            case "KeyW":
                note = 49; // C#3
                break;
            case "KeyS":
                note = 50; // D3
                break;
            case "KeyE":
                note = 51; // D#3
                break;
            case "KeyD":
                note = 52; // E3
                break;
            case "KeyF":
                note = 53; // F3
                break;
            case "KeyT":
                note = 54; // F#3
                break;
            case "KeyG":
                note = 55; // G3
                break;
            case "KeyY":
                note = 56; // G#3
                break;
            case "KeyH":
                note = 57; // A3
                break;
            case "KeyU":
                note = 58; // A#3
                break;
            case "KeyJ":
                note = 59; // B3
                break;
            case "KeyK":
                note = 60; // C4
                break;
            case "KeyO":
                note = 61; // C#4
                break;
            case "KeyL":
                note = 62; // D4
                break;
            default:
                break;
        }

        noteOffStream(note);
    });

}


function loadPlugin() {
    MIDI.loadPlugin({
        soundfontUrl: "./lib/midi/soundfont/",
        // instruments: ["acoustic_grand_piano"],
        // instruments: 2, // acoustic_grand_piano
        instrument: GeneralMidiInstrument,
        onsuccess: function () {
            console.log('MIDI-Plugin loaded');
            initListener();
            initkeyListeners();
        }
    });
}

function play(data) {
    $('#info_text').text('Loading track');
    $('#info').show();

    MIDI.Player.stop();
    MIDI.Player.loadFile(
        data,
        function () {
            $('#info').hide();
            $('#toggle').attr('disabled', false);
            console.log('Song loaded');

            // Find max and min notes
            minNote = 128;
            maxNote = -1;
            for (var i = 0; i < MIDI.Player.data.length; i++) {
                var event = MIDI.Player.data[i][0].event;
                if (event.subtype == "noteOn") {
                    minNote = event.noteNumber < minNote ? event.noteNumber : minNote;
                    maxNote = event.noteNumber > maxNote ? event.noteNumber : maxNote;
                }
            }

            document.getElementById("midiLow").innerHTML = "min = " + minNote;
            document.getElementById("midiHigh").innerHTML = "max = " + maxNote;

            channelsInstruments = MIDI.Player.getFileChannelInstruments();
            instrumentsNames = MIDI.Player.getFileInstruments();

            MIDI.Player.start();
        }
    );
}


// Handling MIDI stream

var midi, data;
// request MIDI access
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    alert("MIDI is not supported in your browser. You can use the keyboard instead or try Chrome.");
}

// midi functions
function onMIDISuccess(midiAccess) {
    // when we get a succesful response, run this code
    midi = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

    var inputs = midi.inputs.values();
    // loop over all available inputs and listen for any MIDI input
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        // each time there is a midi message call the onMIDIMessage function
        input.value.onmidimessage = onMIDIMessage;
    }
}

function onMIDIFailure(error) {
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + error);
}

function getStatus(msg) {
    return msg & 0b11110000;
}

function getChannel(msg) {
    return msg & 0b00001111;
}

function mapLow(note) {
    minNote = note;
    document.getElementById("midiLow").innerHTML = "min = " + minNote;
    document.getElementById("midiLow").className = "noMIDI";
    expectLow = false;
}

function mapHigh(note) {
    maxNote = note;
    document.getElementById("midiHigh").innerHTML = "max = " + maxNote;
    document.getElementById("midiHigh").className = "noMIDI";
    expectHigh = false;
}

function onMIDIMessage(message) {
    data = message.data;

    if (getStatus(data[0]) == NOTE_ON) {
        if (expectLow) {
            mapLow(data[1]);
        }
        else if (expectHigh) {
            mapHigh(data[1]);
        }
        else {
            addBall(data[1], data[2]);
        }
    }
}
