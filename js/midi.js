const NOTE_OFF = 128;
const NOTE_ON = 144;

var channelsInstruments = null;
var minNote = 48;
var maxNote = 62;

// Handling MIDI file
var midiFile;

var pathView = 'explode';

function initListener() {
	MIDI.Player.addListener(
		function(data) {
      if (data.message == NOTE_ON) {
        addBall(data.note, data.velocity);
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
