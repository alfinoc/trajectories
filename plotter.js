var EPSILON = 1;
var GRID_WIDTH = 100;
var GRID_HEIGHT = 100;
var GRID_COLOR = '#eeeeee';
var AXES_COLOR = '#aaaaaa';
var TRAJ_COLOR = 'black';
var TRAJ_HANDLE_RAD = 5;

var EXTREMAL_MARGIN = 1000;
var NUM_EXTREME = 10;
var CURVE_WIDTH = 2;
var DEFAULT_SAMPLES = 300;

var MAX_ITER = 20;

var ViewManager = {
   // view window state
   trueCenter: view.center,
   pixelsPerX: 100,
   pixelsPerY: 100,

   // a list of {fn, path} pairs, 'fn' storing that actual JS function to map
   // x values to y, and 'path' storing its most recently generated control points
   curves: [],
   activeCurve: undefined,

   // a list of trajectories {curve, path} pairs where curve is an element of
   // 'this.curves' and 'path' is a sequence of points, starting with the seed
   // on the x-axis followed by pairs of points (function value, y=x bounce)
   trajectories: [],

   // axes and reference grid
   grid: drawGrid(view.center, view.bounds.width, view.bounds.height),

   // scales all drawn functions by factors. if 'yFactor' is omitted,
   // scales both by 'xFactor'. scales stored curves by factors.
   scale: function(xFactor, yFactor) {
      if (yFactor == undefined)
         yFactor = xFactor;

      this.trueCenter.scale(xFactor, yFactor, view.center);
      this.pixelsPerX *= xFactor;
      this.pixelsPerY *= yFactor;

      GRID_WIDTH *= xFactor;
      GRID_HEIGHT *= yFactor;

      for (var i in this.curves)
         if (this.curves[i])
            this.curves[i].path.scale(xFactor, yFactor, view.center);

      for (var i in this.trajectories) {
         if (this.trajectories[i]) {
            this.trajectories[i].traj.scale(xFactor, yFactor, view.center);
            this.trajectories[i].handle.scale(xFactor, yFactor, view.center);
            this.trajectories[i].handle.scale(1/xFactor, 1/yFactor);
         }
      }

      for (var i in this.grid.vertLines)
         this.grid.vertLines[i].scale(xFactor, 1, view.center);
      for (var i in this.grid.horizLines)
         this.grid.horizLines[i].scale(1, yFactor, view.center);

      this.grid.xAxis.scale(1, yFactor, view.center);
      this.grid.yAxis.scale(xFactor, 1, view.center);
      this.grid.crossLine.scale(xFactor, yFactor, view.center);

      wrapGridLines(this.grid.vertLines, GRID_WIDTH, 'width');
      wrapGridLines(this.grid.horizLines, GRID_HEIGHT, 'height');
   },

   // shifts all drawn images by 'dx' horizontal and 'dy' pixels. affects all future
   // drawing, including subsequently added curves
   translate: function(disp) {
      this.trueCenter += disp;

      // curves
      for (var i in this.curves)
         if (this.curves[i])
            this.curves[i].path.position += disp;

      // trajectories
      for (var i in this.trajectories) {
         if (this.trajectories[i]) {
            this.trajectories[i].traj.position += disp;
            this.trajectories[i].handle.position += disp;
         }
      }

      // grid lines
      for (var i in this.grid.vertLines)
         this.grid.vertLines[i].position.x += disp.x;
      for (var i in this.grid.horizLines)
         this.grid.horizLines[i].position.y += disp.y;

      this.grid.xAxis.position.y += disp.y;
      this.grid.yAxis.position.x += disp.x;
      this.grid.crossLine.position += disp;

      wrapGridLines(this.grid.vertLines, GRID_WIDTH, 'width');
      wrapGridLines(this.grid.horizLines, GRID_HEIGHT, 'height');
   },

   // adds a new path, returning its id (for later lookup). 'fn' specifies
   // a functional-valued JS function of one input (y -> y). the path is drawn
   // with given 'color' and optional number of samples 'numSamples' and curve
   // width 'strokeWidth'. if either of these latter two is undefined, uses default.
   addCurve: function(fn, color, numSamples, strokeWidth) {
      if (numSamples == undefined)
         numSamples = DEFAULT_SAMPLES;
      if (strokeWidth == undefined)
         strokeWidth = CURVE_WIDTH;
      var path = this.drawFunction(fn, numSamples, strokeWidth, color);
      this.curves.push({ "fn":fn, "path": path, "trajs": []});
      paper.view.draw();
      return this.curves.length - 1;
   },

   // removes the path with given 'id'
   removeCurve: function(id) {
      if (!this.curves[id])
         return;

      var trajs = this.curves[id].trajs;
      this.curves[id].path.remove();
      this.curves[id] = undefined;

      console.log(trajs);
      for (var i in trajs)
         this.removeTrajectory(trajs[i]);

      if (this.activeCurve == id)
         this.activeCurve = undefined;

      paper.view.draw();
   },

   // sets the current active curve, upon which new trajectories will be created
   setActiveCurve: function(id) {
      this.activeCurve = id;
   },

   // draws a the function defined the by the functional-valued 'fn' with number
   // of samples 'numSamples', a curve width 'strokeWidth', and provided 'color'
   drawFunction: function(fn, numSamples, strokeWidth, color) {
      var samples = getFunctionSamples(fn, numSamples, -view.bounds.width,
                                                    2 * view.bounds.width);
      var curve = new Path(samples);
      curve.strokeWidth = strokeWidth;
      curve.smooth();
      curve.strokeColor = color;
      return curve;
   },

   // generates a trajectory for curve with 'id' based on 'seed' (see genTrajectory
   // documentation), with given 'color'. trajectory hugs the active curve and is not
   // created if none is active. stores a reference to the new trajectory, and returns
   // its id.
   addTrajectory: function(id, seed, color) {
      if (!id)
         return;

      if (color == undefined)
         color = TRAJ_COLOR

      var curve = this.curves[id];
      var traj = genTrajectory(curve, seed);
      traj.strokeColor = color;

      var seedPt = new Point(seed, 0).toScreenSpace();
      seedPt.y = this.trueCenter.y;
      var seedHandle = new Path.Circle(seedPt, TRAJ_HANDLE_RAD);
      seedHandle.fillColor = color;

      this.trajectories.push({'curve': curve, 'traj':traj,
                              'seed':seed, 'handle':seedHandle});
      var newTrajId = this.trajectories.length -1;
      curve.trajs.push(newTrajId);
      paper.view.draw();
      return newTrajId;
   },

   // moves the seed of the trajectory with given 'trajId' to functional-valued
   // 'newSeed', redrawing the curve based on the new seed. removes previous
   // trajectory.
   moveTrajectory: function(trajId, newSeed) {
      var prev = this.trajectories[trajId];
      var newTraj = genTrajectory(prev.curve, newSeed);

      newTraj.strokeColor = prev.traj.strokeColor;
      prev.traj.remove();
      prev.traj = newTraj;
      prev.seed = newSeed;
      prev.handle.position = new Point(newSeed, 0).toScreenSpace();
      prev.handle.position.y = this.trueCenter.y;
   },

   // removes the trajectory with given 'id'
   removeTrajectory: function(id) {
      console.log(id);
      if (!this.trajectories[id])
         return;

      this.trajectories[id].traj.remove();
      this.trajectories[id].handle.remove();
      this.trajectories[id] = undefined;
      paper.view.draw();
   },

   transferTrajectories: function(trajIds, dstCurveId) {
      var dst = this.curves[dstCurveId];
      for (var trajId in trajIds) {
         var traj = this.trajectories[trajId];
         if (traj) {
            traj.curve = dst;
            dst.trajs.push(trajId);
            this.moveTrajectory(trajId, traj.seed);
            paper.view.draw();
         }
      }
   },

   getTrajectories: function(curveId) {
      return this.curves[curveId].trajs;
   }
}

// based on the state of the view manager, creates and removes grid lines so that
// the window is uniformly covered.
// 'gridLines': the array, sorted by position (left -> right; top -> bottom) of
// all grid line paths in a given dimension
// 'offset': the scaled positional difference between consecutive grid lines
// 'upperBound': either 'width' or 'height', the paperscript view dimension corresponding
// to the farthest right/down a grid line can be
function wrapGridLines(gridLines, offset, upperBound) {
   var dim = (upperBound == 'width') ? 'x' : 'y';
   var first = gridLines[0];
   var last = gridLines[gridLines.length - 1];
   while (first.position[dim] > 0) {
      var newLine = first.clone();
      newLine.position[dim] = first.position[dim] - offset;
      gridLines.unshift(newLine);
      first = gridLines[0];
      last = gridLines[gridLines.length - 1];
   }

   while (last.position[dim] < view.bounds[upperBound]) {
      // first to last
      var newLine = last.clone();
      newLine.position[dim] = last.position[dim] + offset;
      gridLines.push(newLine);

      first = gridLines[0];
      last = gridLines[gridLines.length - 1];
   }

   // destroy lines that are definitely out of range
   if (first.position[dim] < -offset)
      gridLines.shift();
   if (last.position[dim] > view.bounds[upperBound] + offset)
      gridLines.pop();
}

// plots a trajectory until it stabilizes (either converges such that consecutive
// iterations map to the same pixel or the trajectory pops out of view)
// 'curveId': the id for the curve to use as an iteration rule
// 'seed': the functional valued initial input to the desired trajectory
function genTrajectory(curve, seed) {
   var traj = new Path();
   var fnPt = new Point(seed, 0);
   var prev;
   traj.add(prev = fnPt.clone().toScreenSpace());

   var iterCount = 0;
   while (0 < prev.x && prev.x < view.bounds.width &&
          0 < prev.y && prev.y < view.bounds.height && iterCount < MAX_ITER) {

      var newIter;

      fnPt.applyFunction(curve.fn);
      traj.add(fnPt.clone().toScreenSpace());
      fnPt.x = fnPt.y;
      traj.add(newIter = fnPt.clone().toScreenSpace());

      if (newIter.getDistance(prev) < 1)  // convergence
         break;

      prev = newIter;
      iterCount++;
   }
   return traj;
}

// translates a point in functional space to a point in screen space
// note: depends on 'ViewManager' state
Point.prototype.toScreenSpace = function() {
   this.x = this.x * ViewManager.pixelsPerX + ViewManager.trueCenter.x;
   this.y = -this.y * ViewManager.pixelsPerY + ViewManager.trueCenter.y;
   return this;
}

// translates a point in screen space to a point in screen functional
// note: depends on 'ViewManager' state
Point.prototype.toFunctionSpace = function() {
   this.x = (this.x - ViewManager.trueCenter.x) / ViewManager.pixelsPerX;
   this.y = (ViewManager.trueCenter.y / 2 - this.y) / ViewManager.pixelsPerY;
   return this;
}

// replaces a point's y value with the fn(x)
Point.prototype.applyFunction = function(fn) {
   this.y = fn(this.x);
   return this;
}

// scales the point in horizontal and vertical dimensions by 'xFactor' and 'yFactor',
// respectively about the point 'about'. generally same behavior as PS's scale.
Point.prototype.scale = function(xFactor, yFactor, about) {
   this.x = xFactor * (this.x - about.x) + about.x;
   this.y = yFactor * (this.y - about.y) + about.y;
}

function onMouseDrag(event) {
   if (movingSeed) {      
      ViewManager.moveTrajectory(movingSeed, event.point.toFunctionSpace().x);
   } else
      ViewManager.translate(event.delta);
}

var movingSeed = undefined;
function onMouseDown(event) {
   // place seed on doubleclick
   if (event.event.detail > 1 && ViewManager.activeCurve) {
      var newSeed = event.point.clone();
      newSeed.toFunctionSpace();
      ViewManager.addTrajectory(ViewManager.activeCurve, newSeed.x, 'black');
      return;
   }

   // otherwise we're manipulating a seed or the screen
   movingSeed = undefined;
   var trajs = ViewManager.trajectories;
   for (var i in trajs) {
      if (trajs[i] && trajs[i].handle.hitTest(event.point)) {
         if (Key.isDown('command')) {
            ViewManager.removeTrajectory(i);
            return;
         }
         movingSeed = i;
      }
   }
}

function onMouseUp(event) {
   movingSeed = undefined;
}

function onKeyDown(event) {
   if (event.key == 'f')
      ViewManager.scale(1.1);
   else if (event.key == 'd')
      ViewManager.scale(.9);
}

// gets a list of sample Points on the given curve, uniformly distributed along
// the input range. filters out, pretty conservatively, any points that are well
// outside the view window range
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
      pt.applyFunction(fn);  // compute y in functional space
      pt.toScreenSpace();
      if (pt.getDistance(view.center) <= Math.max(minInput, maxInput))
         res.push(pt);
   }

   return res;
}

// draws the axes and grid. returns a object with five fields:
//    'xAxis', 'yAxis': line paths for the x and y axes
//    'vertLines': a sorted array containing the verticle grid lines
//    'horizLines': a sorted array containing the horizontal grid lines
//    'crossLine': line path for the y = x trajectory line
function drawGrid(center, viewWidth, viewHeight) {
   var grid = {};

   grid.vertLines = [];
   grid.horizLines = [];

   var bounds = {
      "minX": 0,
      "minY": 0,
      "maxX": viewWidth,
      "maxY": viewHeight,
   }

   // above x-axis
   for (var i = center.y - GRID_HEIGHT; i > bounds.minY - GRID_HEIGHT; i -= GRID_HEIGHT)
      grid.horizLines.push(getLine(bounds.minX, i, bounds.maxX, i));
   grid.horizLines.reverse();

   // below x-axis
   for (var i = center.y + GRID_HEIGHT; i < bounds.maxY + GRID_HEIGHT; i += GRID_HEIGHT)
      grid.horizLines.push(getLine(bounds.minX, i, bounds.maxX, i));

   // left of y-axis
   for (var i = center.x - GRID_WIDTH; i > bounds.minX - GRID_WIDTH; i -= GRID_HEIGHT)
      grid.vertLines.push(getLine(i, bounds.minY, i, bounds.maxY));
   grid.vertLines.reverse();

   // right of y-axis
   for (var i = center.x + GRID_WIDTH; i < bounds.maxX + GRID_WIDTH; i += GRID_HEIGHT)
      grid.vertLines.push(getLine(i, bounds.minY, i, bounds.maxY));

   grid.xAxis = getLine(bounds.minX, center.y, bounds.maxX, center.y);
   grid.yAxis = getLine(center.x, bounds.minY, center.x, bounds.maxY);
   var minDim = Math.min(bounds.maxX, bounds.maxY);
   grid.crossLine = getLine(center.x - minDim, center.y + minDim,
                            center.x + minDim, center.y - minDim)
   grid.crossLine.scale(10, center);
   
   // attach callbacks for initial animation
   var duration = 0.2;
   grid.xAxis.onFrame = getGradientAnimCallback(duration, AXES_COLOR);
   grid.yAxis.onFrame = getGradientAnimCallback(duration, AXES_COLOR);
   grid.crossLine.onFrame = getGradientAnimCallback(duration, AXES_COLOR);
   for (var i in grid.vertLines)
      grid.vertLines[i].onFrame = getGradientAnimCallback(duration, GRID_COLOR);
   for (var i in grid.horizLines)
      grid.horizLines[i].onFrame = getGradientAnimCallback(duration, GRID_COLOR);
   return grid;
}

// returns a callback for the initial gradient animation of a path.
// must be attached to the given line. 'baseColor' is the destination color
// of the line and 'duration' is the number of seconds the animation will take.
function getGradientAnimCallback(duration, baseColor) {
   var timeLeft = duration;
   return function(event) {
      if (timeLeft > 0) {
         timeLeft -= event.delta;
         var progress = (duration - timeLeft) / duration;
         this.strokeColor = {
            gradient: {
               stops: [[baseColor, Math.min(Math.max(progress * 1.5 - 0.5, 0), 1)],
                       ['white',   Math.min(Math.max(progress, 0), 1)]],
               radial: true
            },
            origin: ViewManager.trueCenter,
            destination: ViewManager.grid.xAxis.bounds.rightCenter,
         }
      } else {
         this.onFrame = undefined;
      }
   }
}

// returns a new straight line path from point (x1, y1) to (x2, y2)
function getLine(x1, y1, x2, y2) {
   return new Path(new Point(x1, y1), new Point(x2, y2));
}

// initialize the plotter
window.plotter = ViewManager;