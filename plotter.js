var EPSILON = 1;
var GRID_WIDTH = 100;
var GRID_HEIGHT = 100;
var GRID_COLOR = '#eeeeee';
var AXES_COLOR = '#aaaaaa';

var CURVE_WIDTH = 2;
var DEFAULT_SAMPLES = 100;

var ViewManager = {
   // view window state
   trueCenter: view.center,
   pixelsPerX: 100,
   pixelsPerY: 100,

   // a list of {fn, path} pairs, 'fn' storing that actual JS function to map
   // x values to y, and 'path' storing its most recently generated control points
   curves: [],

   // axes and reference grid
   grid: drawGrid(view.center, view.bounds.width, view.bounds.height),

   // scales all drawn functions by factors. if 'yFactor' is omitted,
   // scales both by 'xFactor'. scales stored curves by factors.
   scale: function(xFactor, yFactor) {
      if (yFactor == undefined)
         yFactor = xFactor;

      this.pixelsPerX *= xFactor;
      this.pixelsPerY *= yFactor;

      this.redrawCurves();
   },

   // shifts all drawn images by 'dx' horizontal and 'dy' pixels. affects all future
   // drawing, including subsequently added curves
   translate: function(dx, dy) {
      var disp = new Point(dx, dy);
      this.trueCenter += disp;

      for (var i in this.curves)
         this.curves[i].path.position += disp;
      
      for (var i in this.grid.lines)
         this.grid.lines[i].position += disp;
      this.grid.xAxis.position += disp;
      this.grid.yAxis.position += disp;
   },

   // adds a new path, returning its id (for later lookup). 'fn' specifies
   // a functional-valued JS function of one input (y -> y). the path is drawn
   // with given 'color' and optional number of samples 'numSamples'. if latter
   // is undefined, uses default
   addCurve: function(fn, color, numSamples) {
      if (numSamples == undefined)
         numSamples = DEFAULT_SAMPLES;
      var path = this.drawFunction(fn, numSamples);
      path.strokeColor = color;
      this.curves.push({ "fn":fn, "path": path});
      return this.curves.length - 1;
   },

   // removes the path with given 'id'
   removeCurve: function(id) {
      this.curves[id].path.remove();
      this.curves[id] = undefined;
   },

   // redraws all stored curves, recomputing control points
   redrawCurves: function() {
      for (var i in this.curves) {
         var color = path.strokeColor;
         var numSamples = path.samples.length;
         this.curves[i].path.remove();
         this.curves[i].path = this.drawFunction(this.curves[i].fn, color, numSamples);
      }
   },

   // draws a the function defined the by the functional-valed 'fn' with number
   // of samples 'numSamples'.
   drawFunction: function(fn, numSamples) {
      var samples = getFunctionSamples(fn, numSamples, 0, view.bounds.width);
      var curve = new Path(samples);
      curve.strokeWidth = CURVE_WIDTH;
      curve.smooth();
      return curve;
   },
}

// translates a point in functional space to a point in screen space
// note: depends on 'ViewManager' state
Point.prototype.toScreenSpace = function() {
   this.x = this.x * ViewManager.pixelsPerX + ViewManager.trueCenter.x;
   this.y = -this.y * ViewManager.pixelsPerY + ViewManager.trueCenter.y;
}

// translates a point in screen space to a point in screen functional
// note: depends on 'ViewManager' state
Point.prototype.toFunctionSpace = function() {
   this.x = (this.x - ViewManager.trueCenter.x) / ViewManager.pixelsPerX;
   this.y = (ViewManager.trueCenter.y / 2 - this.y) / ViewManager.pixelsPerY;
}

//ViewManager.drawGrid();
//ViewManager.scale(2);
ViewManager.addCurve(getPolynomialByZeros([0, 1, -1]), 'black');
ViewManager.addCurve(getPolynomialByCoeff([0, 0, 1]), 'red');
ViewManager.addCurve(getPolynomialByZeros([0]), 'blue', 2);
ViewManager.translate(100, 200);

// gets a list of sample Points on the given curve, uniformly distributed along
// the input range
// 'fn': functional valued map from x to y values
// 'numSamples': the number of sample points to generate
// 'minInput', 'maxInput' in screen space (pixels): define input range
function getFunctionSamples(fn, numSamples, minInput, maxInput) {
   numSamples--;  // one less segment than sample points
   var res = [];
   var incr = (maxInput - minInput) / numSamples;
   for (var i = minInput; i <= maxInput; i += incr) {
      var pt = new Point(i, 0);  // dummy y value
      pt.toFunctionSpace();
      pt.y = fn(pt.x);  // compute y in functional space
      pt.toScreenSpace();
      res.push(pt);
   }
   return res;
}

// returns a polynomial function based on 'coeff' an array of coefficients, the
// ith index of which is the coefficient for the term of exponent i in the polynomial
function getPolynomialByCoeff(coeff) {
   return function(x) {
      var val = 0;
      for (var i = 0; i < coeff.length; i++)
         val += coeff[i] * Math.pow(x, i);
      return val;
   }
}

// returns a polynomial function based on 'zeros' an array of zeros, where each
// zero z corresponds to a (x - z) factor in the polynomial
function getPolynomialByZeros(zeros) {
   return function(x) {
      var val = 1;
      for (var i = 0; i < zeros.length; i++)
         val *= (x - zeros[i]);
      return val;
   }
}

// draws the axes and grid
function drawGrid(center, viewWidth, viewHeight) {
   var grid = {};

   // write accent lines up to twice the viewSize, precomputing for dragging
   grid.lines = [];

   var bounds = {
      "minX": -viewWidth,
      "minY": -viewHeight,
      "maxX": 2 * viewWidth,
      "maxY": 2 * viewHeight,
   }

   // above x-axis
   for (var i = center.y - GRID_HEIGHT; i > bounds.minY; i -= GRID_HEIGHT)
      grid.lines.push(getLine(bounds.minX, i, bounds.maxX, i));

   // below x-axis
   for (var i = center.y + GRID_HEIGHT; i < bounds.maxY; i += GRID_HEIGHT)
      grid.lines.push(getLine(bounds.minX, i, bounds.maxX, i));

   // left of y-axis
   for (var i = center.x - GRID_WIDTH; i > bounds.minX; i -= GRID_HEIGHT)
      grid.lines.push(getLine(i, bounds.minY, i, bounds.maxY));

   // right of y-axis
   for (var i = center.x + GRID_WIDTH; i < bounds.maxX; i += GRID_HEIGHT)
      grid.lines.push(getLine(i, bounds.minY, i, bounds.maxY));

   grid.xAxis = getLine(bounds.minX, center.y, bounds.maxX, center.y);
   grid.yAxis = getLine(center.x, bounds.minY, center.x, bounds.maxY);

   grid.xAxis.strokeColor = grid.yAxis.strokeColor = AXES_COLOR;
   for (var i in grid.lines)
      grid.lines[i].strokeColor = GRID_COLOR;
   return grid;
}

// returns a new straight line path from point (x1, y1) to (x2, y2)
function getLine(x1, y1, x2, y2) {
   return new Path(new Point(x1, y1), new Point(x2, y2));
}