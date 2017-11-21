// Global variable definition
var canvas;
var gl;
var shaderProgram;

var bannerVertexPositionBuffer;

var red = [1.0, 0.0, 0.2, 1.0];
var color = red;

var midiFile;

var expectLow = false;
var expectHigh = false;

//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initGL(canvas) {
    var gl = null;
    try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch(e) {}

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);

    // Didn't find an element with the specified ID; abort.
    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) {
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we have,
    // based on its MIME type.
    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;  // Unknown shader type
    }

    // Send the source to the shader object
    gl.shaderSource(shader, shaderSource);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    // Create the shader program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    // start using shading program for rendering
    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
}

function initBuffers() {
    var vertices = [
        -1.0,  1.0,
        -1.0, -1.0,
         1.0,  1.0,
         1.0, -1.0
    ];

    bannerVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bannerVertexPositionBuffer.itemSize = 2;
    bannerVertexPositionBuffer.numItems = 4;
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, bannerVertexPositionBuffer.itemSize, gl.FLOAT, false, bannerVertexPositionBuffer.itemSize * 4, 0);

    var itemSize = bannerVertexPositionBuffer.itemSize;
    var numItems = bannerVertexPositionBuffer.numItems;

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, bannerVertexPositionBuffer.numItems);
}

function start() {
    canvas = document.getElementById("glcanvas");

    gl = initGL(canvas);      // Initialize the GL context

    // Only continue if WebGL is available and working
    if (gl) {
        gl.clearColor(0.1, 0.0, 0.2, 1.0);                      // Set clear color to black, fully opaque
        gl.clearDepth(1.0);                                     // Clear everything
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
        gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things

        initShaders();
        initBuffers();

        // Set up to draw the scene periodically.
        // setInterval(drawScene, 15);

        setInterval(function() {
            requestAnimationFrame(animate);
            drawScene();
        }, 15);
    }
}

function animate() {
}

function checkPressedKey(e) {
    color = [Math.random(), Math.random(), Math.random(), 1.0];
}

$(function() {
    /*
     * Initialize file upload
     */
    $('#file_upload').on('change', function() {
        localStorage.clear();
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                play(e.target.result);
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    loadPlugin();
});

function lowNote() {
    expectLow = true;
}

function highNote() {
    expectHigh = true;
}