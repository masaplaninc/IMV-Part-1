
function SimpleRotator(canvas, callback, viewDirectionVector, viewUpVector, viewDistance) {
    var unitx = new Array(3);
    var unity = new Array(3);
    var unitz = new Array(3);
    var viewZ;
    this.setView = function( viewDirectionVector, viewUpVector, viewDistance ) {
        var viewpoint = viewDirectionVector || [0,0,10];
        var viewup = viewUpVector || [0,1,0];
	if (viewDistance && typeof viewDistance == "number")
	    viewZ = viewDistance;
	else
	    viewZ = length(viewpoint);
        copy(unitz,viewpoint);
        normalize(unitz, unitz);
        copy(unity,unitz);
        scale(unity, unity, dot(unitz,viewup));
        subtract(unity,viewup,unity);
        normalize(unity,unity);
        cross(unitx,unity,unitz);
    }
    this.getViewMatrix = function (){
        return new Float32Array( this.getViewMatrixArray() );
    }
    this.getViewMatrixArray = function() {
	return [ unitx[0], unity[0], unitz[0], 0,
            unitx[1], unity[1], unitz[1], 0, 
            unitx[2], unity[2], unitz[2], 0,
	    0, 0, -viewZ, 1 ];
    }
    this.getViewDistance = function() {
	return viewZ;
    }
    this.setViewDistance = function(viewDistance) {
	viewZ = viewDistance;
    }
    function applyTransvection(e1, e2) {  // rotate vector e1 onto e2
        function reflectInAxis(axis, source, destination) {
        	var s = 2 * (axis[0] * source[0] + axis[1] * source[1] + axis[2] * source[2]);
		    destination[0] = s*axis[0] - source[0];
		    destination[1] = s*axis[1] - source[1];
		    destination[2] = s*axis[2] - source[2];
        }
        normalize(e1,e1);
        normalize(e2,e2);
        var e = [0,0,0];
        add(e,e1,e2);
        normalize(e,e);
        var temp = [0,0,0];
        reflectInAxis(e,unitz,temp);
	reflectInAxis(e1,temp,unitz);
	reflectInAxis(e,unitx,temp);
	reflectInAxis(e1,temp,unitx);
	reflectInAxis(e,unity,temp);
	reflectInAxis(e1,temp,unity);
    }
    var centerX = canvas.width/2;
    var centerY = canvas.height/2;
    var radius = Math.min(centerX,centerY);
    var radius2 = radius*radius;
    var prevx,prevy;
    var prevRay = [0,0,0];
    var dragging = false;
    function doMouseDown(evt) {
        if (dragging)
           return;
        dragging = true;
        document.addEventListener("mousemove", doMouseDrag, false);
        document.addEventListener("mouseup", doMouseUp, false);
        var box = canvas.getBoundingClientRect();
        prevx = window.pageXOffset + evt.clientX - box.left;
        prevy = window.pageYOffset + evt.clientY - box.top;
    }
    function doMouseDrag(evt) {
        if (!dragging)
           return;
        var box = canvas.getBoundingClientRect();
        var x = window.pageXOffset + evt.clientX - box.left;
        var y = window.pageYOffset + evt.clientY - box.top;
        var ray1 = toRay(prevx,prevy);
        var ray2 = toRay(x,y);
        applyTransvection(ray1,ray2);
        prevx = x;
        prevy = y;
    if (callback) {
	    callback();
    }
    }
    function doMouseUp(evt) {
        if (dragging) {
            document.removeEventListener("mousemove", doMouseDrag, false);
            document.removeEventListener("mouseup", doMouseUp, false);
	    dragging = false;
        }
    }
    function toRay(x,y) {
       var dx = x - centerX;
       var dy = centerY - y;
       var vx = dx * unitx[0] + dy * unity[0];  // The mouse point as a vector in the image plane.
       var vy = dx * unitx[1] + dy * unity[1];
       var vz = dx * unitx[2] + dy * unity[2];
       var dist2 = vx*vx + vy*vy + vz*vz;
       if (dist2 > radius2) {
          return [vx,vy,vz];
       }
       else {
          var z = Math.sqrt(radius2 - dist2);
          return  [vx+z*unitz[0], vy+z*unitz[1], vz+z*unitz[2]];
        }
    }
    function dot(v,w) {
	return v[0]*w[0] + v[1]*w[1] + v[2]*w[2];
    }
    function length(v) {
	return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    }
    function normalize(v,w) {
	var d = length(w);
	v[0] = w[0]/d;
	v[1] = w[1]/d;
	v[2] = w[2]/d;
    }
    function copy(v,w) {
	v[0] = w[0];
	v[1] = w[1];
	v[2] = w[2];
    }
    function add(sum,v,w) {
	sum[0] = v[0] + w[0];
	sum[1] = v[1] + w[1];
	sum[2] = v[2] + w[2];
    }
    function subtract(dif,v,w) {
	dif[0] = v[0] - w[0];
	dif[1] = v[1] - w[1];
	dif[2] = v[2] - w[2];
    }
    function scale(ans,v,num) {
	ans[0] = v[0] * num;
	ans[1] = v[1] * num;
	ans[2] = v[2] * num;
    }
    function cross(c,v,w) {
	var x = v[1]*w[2] - v[2]*w[1];
	var y = v[2]*w[0] - v[0]*w[2];
	var z = v[0]*w[1] - v[1]*w[0];
	c[0] = x;
	c[1] = y;
	c[2] = z;
    }
    this.setView(viewDirectionVector, viewUpVector, viewDistance);
    canvas.addEventListener("mousedown", doMouseDown, false);
}


