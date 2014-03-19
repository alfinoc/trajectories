var EPSILON = 1;
var GRID_WIDTH = 100;
var GRID_HEIGHT = 100;
var GRID_COLOR = '#eeeeee';
var AXES_COLOR = '#aaaaaa';

var CURVE_WIDTH = 2;
var DEFAULT_SAMPLES = 100;

var pixelsPerX = 100;
var pixelsPerY = 100;

drawGrid();
drawFunction(getPolynomialByZeros([0, 1, -1]), 'black');
drawFunction(getPolynomialByCoeff([0, 0, 1]), 'red');
drawFunction(getPolynomialByZeros([0]), 'blue', 2);

// draws a the function defined the by the functional-valed 'fn' with given 'color',
// and optional number of samples 'numSamples'. if latter is undefined, uses default
function drawFunction(fn, color, numSamples) {
	if (numSamples == undefined)
		numSamples = DEFAULT_SAMPLES;
	var samples = getFunctionSamples(fn, numSamples, 0, view.bounds.width);
	var curve = new Path(samples);
	curve.strokeColor = color;
	curve.strokeWidth = CURVE_WIDTH;
	curve.smooth();
	return curve;
}

// gets a list of sample Points on the given curve, uniformly distributed along
// the input range
// 'fn':
// 'n': the number of sample points to generate
// 'minInput', 'maxInput' in screen space (pixels): define input range
function getFunctionSamples(fn, n, minInput, maxInput) {
	n--;  // one less segment than sample points
	var res = [];
	var incr = (maxInput - minInput) / n;
	for (var i = minInput; i <= maxInput; i += incr) {
		var pt = new Point(i, 0);  // dummy y value
		pt = toFunctionSpace(pt);
		pt.y = fn(pt.x);
		pt = toScreenSpace(pt);
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

// return the translation of 'pt', a point in functional space, to a point
// in screen space
function toScreenSpace(pt) {
	return new Point(pt.x * pixelsPerX + view.bounds.width / 2,
					-pt.y * pixelsPerY + view.bounds.height / 2);
}

// return the translation of 'pt', a point in screen space, to a point
// in functional space
function toFunctionSpace(pt) {
	return new Point((pt.x - view.bounds.width / 2) / pixelsPerX,
					 (view.bounds.height - pt.y / 2) / pixelsPerY);
}

// draws the axes and grid
function drawGrid() {
	var xOffset = view.center.x % GRID_WIDTH;
	var numVert = view.bounds.width / GRID_WIDTH;
	for (var i = 0; i < view.bounds.width / GRID_WIDTH; i++) {
		var vertLine = new Path();
		if (i == Math.floor(numVert / 2))
			vertLine.strokeColor = AXES_COLOR;
		else
			vertLine.strokeColor = GRID_COLOR;
		var start = new Point(i * GRID_WIDTH + xOffset, 0);
		vertLine.add(start, start + new Point(0, view.bounds.height));
	}

	var yOffset = view.center.y % GRID_HEIGHT;
	var numHoriz = view.bounds.height / GRID_HEIGHT;
	for (var i = 0; i < numHoriz; i++) {
		var horizLine = new Path();
		if (i == Math.floor(numHoriz / 2))
			horizLine.strokeColor = AXES_COLOR;
		else
			horizLine.strokeColor = GRID_COLOR;
		var start = new Point(0, i * GRID_HEIGHT + yOffset);
		horizLine.add(start, start + new Point(view.bounds.width, 0));
	}
}