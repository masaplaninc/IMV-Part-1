const SCALE_BALLS = 1;
const SCALE_TUNNEL = 13.6;
const SCALE_SPIKES = 1.0;
const MAX_DIST = 100;
const MAX_POS_SPHERES = 7;
const MAX_POS_SPIKES = 1;
const SPEED_BALLS = 0.01;
const SPEED_CAM = 0.0025;
const SPEED_ROTATION = 0.00005;
const OFFSET_START = 5;
const N_TUNNELS = 4;
const SPIKES_PER_TUNEL = 10;
const COLOR_TUNNEL = [0.0, 0.5, 1.0, 0.5];
const COLOR_SPIKES = [1.0, 0.0, 0.0, 0.8];

var canvas;
var gl;

var startTime = new Date().getTime();
var lastTime = 0;

var camera = [0, 0, -10];

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var expectLow = false;
var expectHigh = false;

// skybox
var skyboxShaderProgram;
var texID;
var cube;
var g_skyBoxUrls = [
    'assets/img/Rightpx.jpg',
    'assets/img/Leftnx.jpg',
    'assets/img/Uppy.jpg',
    'assets/img/Downny.jpg',
    'assets/img/Backpz.jpg',
    'assets/img/Frontnz.jpg'
];

// Variable that stores loading state of textures.
var numberOfTextures = 6;
var texturesLoaded = 0;

// balls
var ballsShaderProgram;
var bannerVertexBuffer;
var balls = []

// TUNNEL
var tunnelShaderProgram;
var app = {};
app.meshes = {};
var rotation = 0;

// coordinates for view through tunnel
var startXposition = 0, startYposition = 0;
var startZposition = 0;
var endZposition = startZposition + SCALE_TUNNEL;
var Zposition = startZposition;

var spikes = [];

function initGL(canvas) {
    var gl = null;
    try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }

    return gl;
}

// function to prepare canvas
function prepareCanvas() {
    gl.clearColor(0.2, 0.0, 0.3, 1.0);                      // Set clear color to black, fully opaque
    gl.clearDepth(1.0);                                     // Clear everything
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

function initSkyboxShader() {
    skyboxShaderProgram = createShaderProgram("skyboxVertexShader", "skyboxFragmentShader");
    gl.useProgram(skyboxShaderProgram);
}

function initBallsShader() {
    ballsShaderProgram = createShaderProgram("shader-vs-balls", "shader-fs-balls")

    gl.useProgram(ballsShaderProgram);

    ballsShaderProgram.vertexPositionAttribute = gl.getAttribLocation(ballsShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(ballsShaderProgram.vertexPositionAttribute);

    ballsShaderProgram.timeUniform = gl.getUniformLocation(ballsShaderProgram, "uTime");
    ballsShaderProgram.aspectRatioUniform = gl.getUniformLocation(ballsShaderProgram, "uAspectRatio");
    ballsShaderProgram.cameraUniform = gl.getUniformLocation(ballsShaderProgram, "uCamera");
    ballsShaderProgram.centerUniform = gl.getUniformLocation(ballsShaderProgram, "uCenter");
    ballsShaderProgram.scaleUniform = gl.getUniformLocation(ballsShaderProgram, "uScale");
}

function initTunnelShader() {
    tunnelShaderProgram = createShaderProgram("tunnel-shader-vs", "tunnel-shader-fs");

    gl.useProgram(tunnelShaderProgram);

    tunnelShaderProgram.vertexPositionAttribute = gl.getAttribLocation(tunnelShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(tunnelShaderProgram.vertexPositionAttribute);
    tunnelShaderProgram.vertexNormalAttribute = gl.getAttribLocation(tunnelShaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(tunnelShaderProgram.vertexNormalAttribute);

    tunnelShaderProgram.pMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uPMatrix");
    tunnelShaderProgram.mvMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uMVMatrix");
    tunnelShaderProgram.nMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uNMatrix");
    tunnelShaderProgram.shininessUniform = gl.getUniformLocation(tunnelShaderProgram, "uShininess");

    tunnelShaderProgram.materialColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uMaterialColor");
    tunnelShaderProgram.materialAlphaUniform = gl.getUniformLocation(tunnelShaderProgram, "uMaterialAlpha");

    tunnelShaderProgram.pointLightingLocationUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingLocation");
    tunnelShaderProgram.ambientColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uAmbientColor");
    tunnelShaderProgram.specularColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uSpecularColor");
    tunnelShaderProgram.diffuseColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uDiffuseColor");
}

function initShaders() {
    initSkyboxShader();
    initBallsShader();
    initTunnelShader();
}

function setSkyboxUniforms() {
    gl.useProgram(skyboxShaderProgram);
    gl.uniformMatrix4fv(uProjection, false, pMatrix);
}

function setBallUniforms(position, scale) {
    gl.useProgram(ballsShaderProgram);
    gl.uniform1f(ballsShaderProgram.timeUniform, 0.001 * (new Date().getTime() - startTime));
    gl.uniform1f(ballsShaderProgram.aspectRatioUniform, gl.viewportWidth / gl.viewportHeight);
    gl.uniform3fv(ballsShaderProgram.cameraUniform, camera);
    gl.uniform3fv(ballsShaderProgram.centerUniform, position);
    gl.uniform1f(ballsShaderProgram.scaleUniform, scale);
}

function setTunnelUniforms(color) {
    gl.useProgram(tunnelShaderProgram);

    gl.uniformMatrix4fv(tunnelShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(tunnelShaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(tunnelShaderProgram.nMatrixUniform, false, normalMatrix);

    gl.uniform3f(tunnelShaderProgram.materialColorUniform, color[0], color[1], color[2]);
    gl.uniform1f(tunnelShaderProgram.materialAlphaUniform, color[3]);

    gl.uniform3f(tunnelShaderProgram.ambientColorUniform, 0.2, 0.2, 0.2);
    gl.uniform3f(tunnelShaderProgram.pointLightingLocationUniform, 2, 0, -5);
    gl.uniform3f(tunnelShaderProgram.specularColorUniform, 1.0, 1.0, 1.0);
    gl.uniform3f(tunnelShaderProgram.diffuseColorUniform, 1.0, 1.0, 1.0);
    gl.uniform1f(tunnelShaderProgram.shininessUniform, 10);
}

function initBuffers() {
    // skybox
    aCoords = gl.getAttribLocation(skyboxShaderProgram, "coords");
    uModelview = gl.getUniformLocation(skyboxShaderProgram, "modelview");
    uProjection = gl.getUniformLocation(skyboxShaderProgram, "projection");

    gl.enableVertexAttribArray(aCoords);
    gl.enable(gl.DEPTH_TEST);

    cube = createModel(makeCube(120));

    loadTextureCube(g_skyBoxUrls);

    // balls
    var bannerVertices = [
        -1.0, 1.0,
        -1.0, -1.0,
        1.0, 1.0,
        1.0, -1.0
    ];

    bannerVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bannerVertices), gl.STATIC_DRAW);
    bannerVertexBuffer.itemSize = 2;
    bannerVertexBuffer.numItems = 4;
}

function loadTextureCube(urls) {
    var ct = 0;
    var img = new Array(6);

    for (var i = 0; i < 6; i++) {
        img[i] = new Image();
        img[i].onload = function () {
            ct++;
            texturesLoaded++;
            if (ct == 6) {
                texID = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texID);

                var targets = [
                    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
                ];

                for (var j = 0; j < 6; j++) {
                    gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img[j]);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                // gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            }
        };
        img[i].src = urls[i];
    }
}

function makeCube(side) {
    var s = (side || 1)/2;
    var coords = [];
    var normals = [];
    var texCoords = [];
    var indices = [];
    function face(xyz, nrm) {
        var start = coords.length/3;
        var i;
        for (i = 0; i < 12; i++) {
            coords.push(xyz[i]);
        }
        for (i = 0; i < 4; i++) {
            normals.push(nrm[0],nrm[1],nrm[2]);
        }
        texCoords.push(0,0,1,0,1,1,0,1);
        indices.push(start,start+1,start+2,start,start+2,start+3);
    }
    face( [-s,-s,s, s,-s,s, s,s,s, -s,s,s], [0,0,1] );
    face( [-s,-s,-s, -s,s,-s, s,s,-s, s,-s,-s], [0,0,-1] );
    face( [-s,s,-s, -s,s,s, s,s,s, s,s,-s], [0,1,0] );
    face( [-s,-s,-s, s,-s,-s, s,-s,s, -s,-s,s], [0,-1,0] );
    face( [s,-s,-s, s,s,-s, s,s,s, s,-s,s], [1,0,0] );
    face( [-s,-s,-s, -s,-s,s, -s,s,s, -s,s,-s], [-1,0,0] );
    return {
        vertexPositions: new Float32Array(coords),
        vertexNormals: new Float32Array(normals),
        vertexTextureCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices)
    }
}

function createModel(modelData) {
    var model = {};

    model.coordsBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();
    model.count = modelData.indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);

    model.render = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(aCoords, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(uModelview, false, mvMatrix);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
    return model;
}

function generateSpikes(remove) {
    if (remove && spikes.length >= SPIKES_PER_TUNEL) {
        spikes.splice(0, SPIKES_PER_TUNEL);
    }

    for (var i = 0; i < SPIKES_PER_TUNEL; i++) {
        var angle = Math.random() * 2 * Math.PI;
        spikes.push({angle: angle,
            position: [Math.cos(angle) * MAX_POS_SPIKES, Math.sin(angle) * MAX_POS_SPIKES, Math.random() * SCALE_TUNNEL],
            scale: [Math.random() * SCALE_SPIKES, Math.random() * SCALE_SPIKES, Math.random() * SCALE_SPIKES]});
    }
    console.log(spikes.length);
}

function drawObject(object, color) {
    setTunnelUniforms(color);

    gl.bindBuffer(gl.ARRAY_BUFFER, object.vertexBuffer);
    gl.vertexAttribPointer(tunnelShaderProgram.vertexPositionAttribute, object.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the normals attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, object.normalBuffer);
    gl.vertexAttribPointer(tunnelShaderProgram.vertexNormalAttribute, object.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the index for the vertices.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer);

    gl.drawElements(gl.TRIANGLES, object.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(70, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    // skybox
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, -rotation, [0, 0, 1]);
    setSkyboxUniforms();
    if (texID) {
        cube.render();
    }

    // tunnel
    for (var i = 0; i < N_TUNNELS; i++) {
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [0, 0, Zposition - startZposition - i * SCALE_TUNNEL]);
        mat4.rotate(mvMatrix, rotation, [0, 0, 1]);
        mat4.scale(mvMatrix, [SCALE_TUNNEL, SCALE_TUNNEL, SCALE_TUNNEL]);

        drawObject(app.meshes.gridFaces, COLOR_TUNNEL);
    }

    // spikes
    for (var i = 0; i < N_TUNNELS; i++) {
        for (var j = 0; j < SPIKES_PER_TUNEL; j++) {
            var pos = i * SPIKES_PER_TUNEL + j;
            mat4.identity(mvMatrix);
            mat4.translate(mvMatrix, [spikes[pos].position[0], spikes[pos].position[1], Zposition - startZposition - spikes[pos].position[2] - i * SCALE_TUNNEL]);
            mat4.rotate(mvMatrix, spikes[pos].angle + 0.5 * Math.PI, [0, 0, 1]);
            mat4.scale(mvMatrix, spikes[pos].scale);

            drawObject(app.meshes.spikeFaces, COLOR_TUNNEL);
        }
    }

    // balls
    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexBuffer);
    gl.vertexAttribPointer(ballsShaderProgram.vertexPositionAttribute, bannerVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    for (var i = 0; i < balls.length; i++) {
        setBallUniforms(balls[i].position, balls[i].scale);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, bannerVertexBuffer.numItems);
    }
}

function start(meshes) {
    canvas = document.getElementById("glcanvas");

    gl = initGL(canvas);      // Initialize the GL context
    if (!gl) {
        return;
    }

    prepareCanvas();
    initShaders();

    // TUNNEL
    // initialize meshes
    app.meshes = meshes;
    // initialize the VBOs
    // OBJ.initMeshBuffers(gl, app.meshes.gridFrame);
    OBJ.initMeshBuffers(gl, app.meshes.gridFaces);
    OBJ.initMeshBuffers(gl, app.meshes.spikeFrame);
    OBJ.initMeshBuffers(gl, app.meshes.spikeFaces);

    // skybox & balls
    initBuffers();

    setInterval(function () {
        if (texturesLoaded == numberOfTextures) {
            requestAnimationFrame(animate);
            drawScene();
        }
    }, 15);
}

function addBall(note, velocity) {
    var x = Math.random() * (2 * MAX_POS_SPHERES) - MAX_POS_SPHERES;
    var y = ((note - minNote) / (maxNote - minNote)) * (2 * MAX_POS_SPHERES) - MAX_POS_SPHERES;
    var z = camera[2] + OFFSET_START;
    balls.push({position: [x, y, z], scale: SCALE_BALLS * velocity / 127});
}

function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;

        Zposition += elapsed * SPEED_CAM;
        if (Zposition >= endZposition - 1) {
            startZposition = endZposition;
            endZposition += SCALE_TUNNEL;
            generateSpikes(true);
        }

        rotation += elapsed * SPEED_ROTATION;

        for (var i = 0; i < balls.length; i++) {
            // remove the ball if too far
            if (balls[i].position[2] - camera[2] > MAX_DIST - 2 * balls.length) {
                balls.splice(i, 1);
            }
            // otherwise move it forward
            else {
                balls[i].position[2] += elapsed * SPEED_BALLS;
            }
        }
    }
    lastTime = timeNow;

}

$(function () {
    /*
     * Initialize file upload
     */
    $('#file_upload').on('change', function () {
        localStorage.clear();
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
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

function mapKey(event) {
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

    if (note) {
        if (expectLow) {
            mapLow(note);
        }
        else if (expectHigh) {
            mapHigh(note);
        }
        else {
            addBall(note, 63);
        }
    }
}

// load meshes when page loads
window.onload = function () {
    OBJ.downloadMeshes({
        // 'gridFrame': 'assets/gridokvir.obj',
        'gridFaces': 'assets/gridploskve.obj',
        'spikeFrame': 'assets/spicaokvir.obj',
        'spikeFaces': 'assets/spicaploskve.obj',
    }, start);

    document.getElementById("midiHigh").innerHTML = "max = " + maxNote;
    document.getElementById("midiLow").innerHTML = "min = " + minNote;

    for (var i = 0; i < N_TUNNELS; i++) {
        generateSpikes(false);
    }
};