const SCALE = 1;
const MAX_DIST = 100;
const MAX_POS = 7;
const SPEED_BALLS = 0.01;
const OFFSET_START = 3

var canvas;
var gl;

var startTime = new Date().getTime();
var lastTime = 0;

var camera = [0, 0, -10];

// skybox
var skyboxShaderProgram;
var skyboxVertexBuffer;
var skyboxIndexBuffer;

// ballls
var ballsShaderProgram;
var bannerVertexBuffer;
var balls = []

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var expectLow = false;
var expectHigh = false;

// TUNNEL
var tunnelShaderProgram;
var app = {};
app.meshes = {};

// coordinates for view through tunnel
var startXposition = 2.23, startYposition = -3.6;
var startZposition = -10;
var tunnelLen = 12;
var endZposition = startZposition + tunnelLen;
var Zposition = startZposition;

// Variable that stores  loading state of textures.
var numberOfTextures = 1;
var texturesLoaded = 0;

//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//
function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

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

function initSkyboxShader() {
    skyboxShaderProgram = createShaderProgram("shader-vs-skybox", "shader-fs-skybox");
    
    gl.useProgram(skyboxShaderProgram);

    skyboxShaderProgram.vertexPositionAttribute = gl.getAttribLocation(skyboxShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(skyboxShaderProgram.vertexPositionAttribute);

    skyboxShaderProgram.pMatrixUniform = gl.getUniformLocation(skyboxShaderProgram, "uPMatrix");
    skyboxShaderProgram.mvMatrixUniform = gl.getUniformLocation(skyboxShaderProgram, "uMVMatrix");
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

    tunnelShaderProgram.textureCoordAttribute = gl.getAttribLocation(tunnelShaderProgram, "aTextureCoord");
    tunnelShaderProgram.pMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uPMatrix");
    tunnelShaderProgram.mvMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uMVMatrix");
    tunnelShaderProgram.nMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uNMatrix");
    tunnelShaderProgram.samplerUniform = gl.getUniformLocation(tunnelShaderProgram, "uSampler");
    tunnelShaderProgram.materialShininessUniform = gl.getUniformLocation(tunnelShaderProgram, "uMaterialShininess");
    tunnelShaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(tunnelShaderProgram, "uShowSpecularHighlights");
    tunnelShaderProgram.useTexturesUniform = gl.getUniformLocation(tunnelShaderProgram, "uUseTextures");
    tunnelShaderProgram.useLightingUniform = gl.getUniformLocation(tunnelShaderProgram, "uUseLighting");
    tunnelShaderProgram.ambientColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uAmbientColor");
    tunnelShaderProgram.pointLightingLocationUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingLocation");
    tunnelShaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingSpecularColor");
    tunnelShaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingDiffuseColor");
}

function initShaders() {
    initSkyboxShader();
    initBallsShader();
    initTunnelShader();
}

function setSkyboxUniforms() {
    gl.useProgram(skyboxShaderProgram);

    gl.uniformMatrix4fv(skyboxShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(skyboxShaderProgram.mvMatrixUniform, false, mvMatrix);
}

function setBallUniforms(position, scale) {
    gl.useProgram(ballsShaderProgram);
    gl.uniform1f(ballsShaderProgram.timeUniform, 0.001 * (new Date().getTime() - startTime));
    gl.uniform1f(ballsShaderProgram.aspectRatioUniform, gl.viewportWidth / gl.viewportHeight);
    gl.uniform3fv(ballsShaderProgram.cameraUniform, camera);
    gl.uniform3fv(ballsShaderProgram.centerUniform, position);
    gl.uniform1f(ballsShaderProgram.scaleUniform, scale);
}

function setTunnelMatrixUniforms() {
    gl.uniformMatrix4fv(tunnelShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(tunnelShaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(tunnelShaderProgram.nMatrixUniform, false, normalMatrix);
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

function drawTunnelObject(object) {
    gl.useProgram(tunnelShaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, object.vertexBuffer);
    gl.vertexAttribPointer(tunnelShaderProgram.vertexPositionAttribute, object.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the normals attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, object.normalBuffer);
    gl.vertexAttribPointer(tunnelShaderProgram.vertexNormalAttribute, object.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the index for the vertices.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer);
    setTunnelMatrixUniforms();

    gl.drawElements(gl.TRIANGLES, object.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    mat4.identity(mvMatrix);
    // mat4.translate(mvMatrix, CAMERA_POSITION);

    // tunnel
       gl.useProgram(tunnelShaderProgram);

    gl.uniform3f(
        tunnelShaderProgram.ambientColorUniform,
        parseFloat(0.2),
        parseFloat(0.2),
        parseFloat(0.2)
    );

    gl.uniform3f(
        tunnelShaderProgram.pointLightingLocationUniform,
        parseFloat(-10),
        parseFloat(4),
        parseFloat(-20)
    );

    gl.uniform3f(
        tunnelShaderProgram.pointLightingSpecularColorUniform,
        parseFloat(0.8),
        parseFloat(0.8),
        parseFloat(0.8)
    );

    gl.uniform3f(
        tunnelShaderProgram.pointLightingDiffuseColorUniform,
        parseFloat(0.8),
        parseFloat(0.8),
        parseFloat(0.8)
    );


    // Textures
    var texture = "gridTexture";

    // set uniform to the value of the checkbox.
    gl.uniform1i(tunnelShaderProgram.useTexturesUniform, texture != "none");

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);

    // Now move the drawing position a bit to where we want to start
    // drawing the world.


    mat4.translate(mvMatrix, [startXposition, startYposition, Zposition]); // as close to center of the tunnel as I get


    if (Zposition >= endZposition - 10) {
        startZposition = endZposition;
        endZposition += tunnelLen;
    }

    // fIRST tunnel - where we start
    mvPushMatrix();

    mat4.translate(mvMatrix, [0, 0, -startZposition]);

    mat4.rotate(mvMatrix, Math.PI / 2, [0, 1, 0]);
    // Activate textures
    // NO TEXTURES YET
    /*
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D, gridTexture);
     */

    gl.uniform1i(tunnelShaderProgram.samplerUniform, 0);

    // Activate shininess
    gl.uniform1f(tunnelShaderProgram.materialShininessUniform, true);

    // drawTunnelObject(app.meshes.gridFrame); // problems
    drawTunnelObject(app.meshes.gridFaces);

    mvPopMatrix();


    // second tunnel
    mvPushMatrix();

    mat4.translate(mvMatrix, [0, 0, -endZposition]);

    mat4.rotate(mvMatrix, Math.PI / 2, [0, 1, 0]);
    // Activate textures
    // NO TEXTURES YET
    /*
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D, gridTexture);
     */

    gl.uniform1i(tunnelShaderProgram.samplerUniform, 0);

    // Activate shininess
    gl.uniform1f(tunnelShaderProgram.materialShininessUniform, true);

    // drawTunnelObject(app.meshes.gridFrame); // problems
    drawTunnelObject(app.meshes.gridFaces);

    mvPopMatrix();

    // third tunnel
    mvPushMatrix();

    mat4.translate(mvMatrix, [0, 0, -endZposition - tunnelLen]);

    mat4.rotate(mvMatrix, Math.PI / 2, [0, 1, 0]);
    // Activate textures
    // NO TEXTURES YET
    /*
     gl.activeTexture(gl.TEXTURE0);
     gl.bindTexture(gl.TEXTURE_2D, gridTexture);
     */

    gl.uniform1i(tunnelShaderProgram.samplerUniform, 0);

    // Activate shininess
    gl.uniform1f(tunnelShaderProgram.materialShininessUniform, true);

    // drawTunnelObject(app.meshes.gridFrame); // problems
    drawTunnelObject(app.meshes.gridFaces);

    mvPopMatrix();

    // Two spikes

    mvPushMatrix();
    mat4.translate(mvMatrix, [-startXposition, 0, -2]);

    drawTunnelObject(app.meshes.spikeFaces);
    drawTunnelObject(app.meshes.spikeFrame);

    mvPopMatrix();

    mvPushMatrix();
    mat4.translate(mvMatrix, [-startXposition + 3, 3, 3]);
    mat4.rotate(mvMatrix, degToRad(90), [0, 0, 1]);

    drawTunnelObject(app.meshes.spikeFaces);
    drawTunnelObject(app.meshes.spikeFrame);

    mvPopMatrix();
    
    // skybox
    setSkyboxUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.vertexAttribPointer(skyboxShaderProgram.vertexPositionAttribute, skyboxVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);

    gl.drawElements(gl.TRIANGLES, skyboxIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    // balls
    gl.bindBuffer(gl.ARRAY_BUFFER, bannerVertexBuffer);
    gl.vertexAttribPointer(ballsShaderProgram.vertexPositionAttribute, bannerVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    for (var i=0; i<balls.length; i++) {
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
    // initialize textures
    // NO TEXTURES YET
    /*
     initTextures();
     */

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
        //if (texturesLoaded == numberOfTextures) { // only draw scene and animate when textures are loaded.
        requestAnimationFrame(animate);
        drawScene();
        //}
    }, 15);

}

function addBall(note, velocity) {
    var x = Math.random() * (2 * MAX_POS) - MAX_POS;
    var y = ((note - minNote) / (maxNote - minNote)) * (2 * MAX_POS) - MAX_POS;
    var z = camera[2] + OFFSET_START;
    balls.push({position: [x, y, z], scale: SCALE * velocity / 127});
}

function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;

        Zposition += 0.05; // change Z coordinate to move through the tunnel

        for (var i=0; i<balls.length; i++) {
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
    switch(event.code) {
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
};
