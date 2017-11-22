var canvas;
var gl;

// Model-View and Projection matrices
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// skybox
var skyboxShaderProgram;
var skyboxVertexBuffer;
var skyboxIndexBuffer;

// ballls
var ballsShaderProgram;
var bannerVertexBuffer;

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

function createShaderProgram(vsName, fsName) {
    var vertexShader = getShader(gl, vsName);
    var fragmentShader = getShader(gl, fsName);

    // Create the shader program
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program using " + vsName + " and " + fsName + ".");
    }

    return shaderProgram;
}

function initShaders() {
    // skybox
    skyboxShaderProgram = createShaderProgram("shader-vs-skybox", "shader-fs-skybox");
    
    gl.useProgram(skyboxShaderProgram);

    skyboxShaderProgram.vertexPositionAttribute = gl.getAttribLocation(skyboxShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(skyboxShaderProgram.vertexPositionAttribute);

    skyboxShaderProgram.pMatrixUniform = gl.getUniformLocation(skyboxShaderProgram, "uPMatrix");
    skyboxShaderProgram.mvMatrixUniform = gl.getUniformLocation(skyboxShaderProgram, "uMVMatrix");

    // balls
    ballsShaderProgram = createShaderProgram("shader-vs-balls", "shader-fs-balls")

    gl.useProgram(ballsShaderProgram);

    ballsShaderProgram.vertexPositionAttribute = gl.getAttribLocation(ballsShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(ballsShaderProgram.vertexPositionAttribute);
}

function initBuffers() {
    // skybox
    var skyboxVertices = [
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0
    ];

    skyboxVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyboxVertices), gl.STATIC_DRAW);

    skyboxVertexBuffer.itemSize = 3;
    skyboxVertexBuffer.numItems = 8;

    var skyboxIndices = [
        0, 2, 4,   4, 2, 6, // back face
        0, 1, 2,   2, 1, 3, // left face
        1, 5, 3,   3, 5, 7, // front face
        5, 4, 7,   7, 4, 6, // right face
        3, 7, 2,   2, 7, 6, // upper face
        0, 4, 1,   1, 4, 5, // lower face
    ];

    skyboxIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyboxIndices), gl.STATIC_DRAW);

    skyboxIndexBuffer.itemSize = 3;
    skyboxIndexBuffer.numItems = 12;

    // balls
    var bannerVertices = [
        -1.0,  1.0,
        -1.0, -1.0,
         1.0,  1.0,
         1.0, -1.0
    ];

    bannerVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bannerVertices), gl.STATIC_DRAW);
    bannerVertexBuffer.itemSize = 2;
    bannerVertexBuffer.numItems = 4;
}

function setSkyboxUniforms() {
    gl.uniformMatrix4fv(skyboxShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(skyboxShaderProgram.mvMatrixUniform, false, mvMatrix);
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    mat4.identity(mvMatrix);
    // mat4.translate(mvMatrix, CAMERA_POSITION);
    
    // skybox
    gl.useProgram(skyboxShaderProgram);

    setSkyboxUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.vertexAttribPointer(skyboxShaderProgram.vertexPositionAttribute, skyboxVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);

    gl.drawElements(gl.TRIANGLES, skyboxIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    // balls
    gl.useProgram(ballsShaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexBuffer);
    gl.vertexAttribPointer(ballsShaderProgram.vertexPositionAttribute, bannerVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, bannerVertexBuffer.numItems);
}

function start() {
    canvas = document.getElementById("glcanvas");

    gl = initGL(canvas);      // Initialize the GL context

    // Only continue if WebGL is available and working
    if (gl) {
        gl.clearColor(0.2, 0.0, 0.3, 1.0);                      // Set clear color to black, fully opaque
        gl.clearDepth(1.0);                                     // Clear everything
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
        gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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

// MIDI to 3D space mapping

var expectLow = false;
var expectHigh = false;

function lowNote() {
    expectLow = true;
    document.getElementById("midiLow").className = "expectMIDI";
}

function highNote() {
    expectHigh = true;
    document.getElementById("midiHigh").className = "expectMIDI";
}