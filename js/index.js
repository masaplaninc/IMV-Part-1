var canvas;
var gl;
var tunnelShaderProgram;

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Helper variable for animation
var lastTime = 0;

var app = {};
app.meshes = {};

// coordinates for view through tunnel
var startXposition = 2.23, startYposition = -3.6;
var startZposition = -10;
var tunnelLen = 12;
var endZposition = startZposition + tunnelLen;

var Zposition = startZposition;


// BUFFERS:
// vertexBuffer
// normalBuffer
// textureBuffer
// indexBuffer

// var gridTexture;


// Variable that stores  loading state of textures.
var numberOfTextures = 1;
var texturesLoaded = 0;


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


function initShaders() {
    var fragmentShader = getShader(gl, "tunnel-shader-fs");
    var vertexShader = getShader(gl, "tunnel-shader-vs");

    // Create the shader program
    tunnelShaderProgram = gl.createProgram();
    gl.attachShader(tunnelShaderProgram, vertexShader);
    gl.attachShader(tunnelShaderProgram, fragmentShader);
    gl.linkProgram(tunnelShaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(tunnelShaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

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
// setMatrixUniforms
//
// Set the uniform values in shaders for model-view and projection matrix.
//
function setMatrixUniforms() {
    gl.uniformMatrix4fv(tunnelShaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(tunnelShaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(tunnelShaderProgram.nMatrixUniform, false, normalMatrix);
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
 */

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


function drawTunnelObject(object) {
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
    setMatrixUniforms();

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
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);


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
// animate
//
// Called every time before redeawing the screen.
//
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;

        Zposition += 0.05; // change Z coordinate to move through the tunnel

        // if (Zposition >= 2) { // temporary - so it doesn't run into the wild
        //     Zposition = startZposition;
        // }
    }
    lastTime = timeNow;
}


function webGLStart(meshes) {
    canvas = document.getElementById("glcanvas");

    // Initialize the GL context
    gl = initGL(canvas);

    // Only continue if WebGL is available and working
    if (!gl) {
        return;
    }

    // clear canvas and configure gl parameters
    prepareCanvas();

    // initialize shaders
    initShaders();

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


    //... other cool stuff ...
    // refer to the initMeshBuffers docs for an example of
    // how to render the mesh to the screen after calling
    // initMeshBuffers

    // Set up to draw the scene periodically.
    setInterval(function () {
        //if (texturesLoaded == numberOfTextures) { // only draw scene and animate when textures are loaded.
        requestAnimationFrame(animate);
        drawScene();
        //}
    }, 15);


    // draw scene just one time
    // if (texturesLoaded == numberOfTextures) { // only draw scene and animate when textures are loaded.
    //     requestAnimationFrame(animate);
    //     drawScene();
    // }


}


// load meshes when page loads
window.onload = function () {
    OBJ.downloadMeshes({
        // 'gridFrame': 'assets/gridokvir.obj',
        'gridFaces': 'assets/gridploskve.obj',
        'spikeFrame': 'assets/spicaokvir.obj',
        'spikeFaces': 'assets/spicaploskve.obj',
    }, webGLStart);
};
