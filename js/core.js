// Global variable definition
var canvas;
var gl;
var triangleShaderProgram;
var tunnelShaderProgram;

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Helper variable for animation
var lastTime = 0;

// variable for midi file (if loaded)
var midiFile;

// TRIANGLE
// Buffers
var triangleVertexPositionBuffer;
var triangleVertexColorBuffer;

// color array
var red = [1.0, 0.0, 0.2, 1.0];
var color = red;

var expectLow = false;
var expectHigh = false;

// TUNNEL
var app = {};
app.meshes = {};
// BUFFERS:
// vertexBuffer
// normalBuffer
// textureBuffer
// indexBuffer

// coordinates for view through tunnel
var startXposition = 2.23, startYposition = -3.6;
var startZposition = -10;
var tunnelLen = 12;
var endZposition = startZposition + tunnelLen;
var Zposition = startZposition;

// var gridTexture;


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

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}

// function to prepare canvas
function prepareCanvas() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque -> yellow
    gl.clearDepth(1.0);                                     // Clear everything
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear the color as well as the depth buffer.

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


function initTriangleShader() {
    // TRIANGLE
    triangleShaderProgram = createShaderProgram("triangle-shader-vs", "triangle-shader-fs");

    // start using shading program for rendering
    gl.useProgram(triangleShaderProgram);

    // store location of aVertexPosition variable defined in shader
    triangleShaderProgram.vertexPositionAttribute = gl.getAttribLocation(triangleShaderProgram, "aVertexPosition");

    // turn on vertex position attribute at specified position
    gl.enableVertexAttribArray(triangleShaderProgram.vertexPositionAttribute);

    // store location of aVertexColor variable defined in shader
    triangleShaderProgram.vertexColorAttribute = gl.getAttribLocation(triangleShaderProgram, "aVertexColor");
    // za vertex color

    // turn on vertex color attribute at specified position
    gl.enableVertexAttribArray(triangleShaderProgram.vertexColorAttribute);

    // store location of uPMatrix variable defined in shader - projection matrix
    triangleShaderProgram.pMatrixUniform = gl.getUniformLocation(triangleShaderProgram, "uPMatrix");

    // store location of uMVMatrix variable defined in shader - model-view matrix
    triangleShaderProgram.mvMatrixUniform = gl.getUniformLocation(triangleShaderProgram, "uMVMatrix");

}



function initTunnelShader() {
    // TUNNEL

    // Create the shader program
    tunnelShaderProgram = createShaderProgram("tunnel-shader-vs", "tunnel-shader-fs");

    // start using shading program for rendering
    gl.useProgram(tunnelShaderProgram);

    // store location of aVertexPosition variable defined in shader
    tunnelShaderProgram.vertexPositionAttribute = gl.getAttribLocation(tunnelShaderProgram, "aVertexPosition");

    // turn on vertex position attribute at specified position
    gl.enableVertexAttribArray(tunnelShaderProgram.vertexPositionAttribute);

    // store location of vertex normals variable defined in shader
    tunnelShaderProgram.vertexNormalAttribute = gl.getAttribLocation(tunnelShaderProgram, "aVertexNormal");

    // turn on vertex normals attribute at specified position
    gl.enableVertexAttribArray(tunnelShaderProgram.vertexNormalAttribute);


    // store location of texture coordinate variable defined in shader
    tunnelShaderProgram.textureCoordAttribute = gl.getAttribLocation(tunnelShaderProgram, "aTextureCoord");

    // turn on texture coordinate attribute at specified position
    // NO TEXTURES YET
    // gl.enableVertexAttribArray(tunnelShaderProgram.textureCoordAttribute);

    // store location of uPMatrix variable defined in shader - projection matrix
    tunnelShaderProgram.pMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uPMatrix");
    // store location of uMVMatrix variable defined in shader - model-view matrix
    tunnelShaderProgram.mvMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uMVMatrix");
    // store location of uNMatrix variable defined in shader - normal matrix
    tunnelShaderProgram.nMatrixUniform = gl.getUniformLocation(tunnelShaderProgram, "uNMatrix");
    // store location of uSampler variable defined in shader
    tunnelShaderProgram.samplerUniform = gl.getUniformLocation(tunnelShaderProgram, "uSampler");
    // store location of uMaterialShininess variable defined in shader
    tunnelShaderProgram.materialShininessUniform = gl.getUniformLocation(tunnelShaderProgram, "uMaterialShininess");

    // store location of uShowSpecularHighlights variable defined in shader
    tunnelShaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(tunnelShaderProgram, "uShowSpecularHighlights");

    // store location of uUseTextures variable defined in shader
    tunnelShaderProgram.useTexturesUniform = gl.getUniformLocation(tunnelShaderProgram, "uUseTextures");

    // store location of uUseLighting variable defined in shader
    tunnelShaderProgram.useLightingUniform = gl.getUniformLocation(tunnelShaderProgram, "uUseLighting");

    // store location of uAmbientColor variable defined in shader
    tunnelShaderProgram.ambientColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uAmbientColor");

    // store location of uPointLightingLocation variable defined in shader
    tunnelShaderProgram.pointLightingLocationUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingLocation");

    // store location of uPointLightingSpecularColor variable defined in shader
    tunnelShaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingSpecularColor");

    // store location of uPointLightingDiffuseColor variable defined in shader
    tunnelShaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(tunnelShaderProgram, "uPointLightingDiffuseColor");

}


//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {

    initTriangleShader();

    initTunnelShader();

    // same for skybox
}


//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//

// NO TEXTURES YET
/*
 function initTextures() {
 gridTexture = gl.createTexture();
 gridTexture.image = new Image();
 gridTexture.image.onload = function () {
 handleTextureLoaded(gridTexture)
 };
 gridTexture.image.src = "./assets/gridTexture.jpg";

 }


function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Third texture usus Linear interpolation approximation with nearest Mipmap selection
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);

    // when texture loading is finished we can draw scene.
    texturesLoaded += 1;
}

*/

//
// setTriangleMatrixUniforms
//
// Set the uniform values in shaders for model-view and projection matrix.
//
function setTriangleMatrixUniforms() {
    gl.uniformMatrix4fv(triangleShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(triangleShaderProgram.mvMatrixUniform, false, mvMatrix);
}


//
// setTunnelMatrixUniforms
//
// Set the uniform values in shaders for model-view and projection matrix.
//
function setTunnelMatrixUniforms() {
    gl.uniformMatrix4fv(tunnelShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(tunnelShaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(tunnelShaderProgram.nMatrixUniform, false, normalMatrix);
}


//
// initTriangleBuffers
//
// Initialize the buffers we'll need. For this demo, we just have
// two objects -- a simple two-dimensional triangle and square.
//
function initTriangleBuffers() {
    // TRIANGLE
    // Create a buffer for the triangle's vertices.
    triangleVertexPositionBuffer = gl.createBuffer();

    // Select the triangleVertexPositionBuffer as the one to apply vertex
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    var vertices = [
        0.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0
    ];

    // Pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    triangleVertexPositionBuffer.itemSize = 3;
    triangleVertexPositionBuffer.numItems = 3;

    // Now set up the colors for the vertices
    triangleVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);


    // Pass the colors into WebGL
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color.concat(color).concat(color).concat(color)), gl.DYNAMIC_DRAW);
    triangleVertexColorBuffer.itemSize = 4;
    triangleVertexColorBuffer.numItems = 3;


}

function drawTunnelObject(object) {

    gl.useProgram(tunnelShaderProgram);

    // Set the vertex positions attribute for the teapot vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, object.vertexBuffer);
    gl.vertexAttribPointer(tunnelShaderProgram.vertexPositionAttribute, object.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    // NO TEXTURES YET

    /*
     if(!object.textures.length){
     // disable, if object has no texture coordinates
     gl.disableVertexAttribArray(tunnelShaderProgram.textureCoordAttribute);
     }
     else{
     // if the texture vertexAttribArray has been previously
     // disabled, then it needs to be re-enabled
     gl.enableVertexAttribArray(tunnelShaderProgram.textureCoordAttribute);
     gl.bindBuffer(gl.ARRAY_BUFFER, object.textureBuffer);
     gl.vertexAttribPointer(tunnelShaderProgram.textureCoordAttribute, object.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
     }
     */

    // Set the normals attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, object.normalBuffer);
    gl.vertexAttribPointer(tunnelShaderProgram.vertexNormalAttribute, object.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the index for the vertices.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.indexBuffer);
    setTunnelMatrixUniforms();

    // Draw the teapot
    gl.drawElements(gl.TRIANGLES, object.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}



//
// drawScene
//
// Draw the scene.
//
function drawScene() {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);



    // TRIANGLE
    gl.useProgram(triangleShaderProgram);

    // Now move the drawing position a bit to where we want to start
    // drawing the triangle.
    mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);

    // Draw the triangle by binding the array buffer to the square's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    gl.vertexAttribPointer(triangleShaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the colors attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
    gl.vertexAttribPointer(triangleShaderProgram.vertexColorAttribute, triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the triangle.
    setTriangleMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);


    // TUNNEL
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

}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start(meshes) {

    canvas = document.getElementById("glcanvas");

    gl = initGL(canvas);      // Initialize the GL context

    // Only continue if WebGL is available and working
    if (!gl) {
        return;
    }

    prepareCanvas();

    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();


    // TIRANGLE
    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initTriangleBuffers();


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

    // Set up to draw the scene periodically.
    // setInterval(drawScene, 15);

    setInterval(function () {
        //if (texturesLoaded == numberOfTextures) { // only draw scene and animate when textures are loaded.
        requestAnimationFrame(animate);
        drawScene();
        //}
    }, 15);

}

function animate() {
    // advice from other student in RGTI class:
    // should also bind the buffer again
    // to prevent weird errors
    gl.useProgram(triangleShaderProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color.concat(color).concat(color).concat(color)), gl.DYNAMIC_DRAW);

    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;
        Zposition += 0.05; // change Z coordinate to move through the tunnel
    }
    lastTime = timeNow;

}

function checkPressedKey(e) {
    color = [Math.random(), Math.random(), Math.random(), 1.0];
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

function lowNote() {
    expectLow = true;
}

function highNote() {
    expectHigh = true;
}


// load meshes when page loads
window.onload = function () {
    OBJ.downloadMeshes({
        // 'gridFrame': 'assets/gridokvir.obj',
        'gridFaces': 'assets/gridploskve.obj',
        'spikeFrame': 'assets/spicaokvir.obj',
        'spikeFaces': 'assets/spicaploskve.obj',
    }, start);
};