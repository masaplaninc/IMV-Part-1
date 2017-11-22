const NOTE_OFF = 128;
const NOTE_ON = 144;

// Handling MIDI file

var pathView = 'explode';

function initListener() {
	MIDI.Player.addListener(
		function(data) {
      if (data.message == NOTE_ON) {
        checkPressedKey();
      }
    }
	);
}

function loadPlugin() {
	MIDI.loadPlugin({
		soundfontUrl: "./lib/midi/soundfont/",
		//instruments: ["acoustic_grand_piano"],
    instruments: 2, // acoustic_grand_piano
		onsuccess: function() {
			console.log('MIDI-Plugin loaded');
			initListener();
		}
	});
}

var channelsInstruments = null;
var minNote = 128;
var maxNote = -1;

function play(data) {
	$('#info_text').text('Loading track');
	$('#info').show();

	MIDI.Player.stop();
	MIDI.Player.loadFile(
		data,
		function() {
			$('#info').hide();
			$('#toggle').attr('disabled', false);
			console.log('Song loaded');
            
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
    alert("No MIDI support in your browser.");
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

function onMIDIMessage(message) {
 data = message.data; // this gives us our [command/channel, note, velocity] data.
  console.log('MIDI data', data); // MIDI data [144, 63, 73]

  if (getStatus(data[0]) == NOTE_ON) {
    if (expectLow) {
      minNote = data[1];
      document.getElementById("midiLow").innerHTML = "min = " + minNote;
      expectLow = false;
    }
    else if (expectHigh) {
      maxNote = data[1];
      document.getElementById("midiHigh").innerHTML = "max = " + maxNote;
      expectHigh = false;
    }
    else {
      checkPressedKey();
    }
  }
}
