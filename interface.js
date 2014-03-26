var nextColor = 0;
var colors = ['#437BA8', '#92130A', '#007644', '#AA3AD3', '#FF7C21'];
var colors_rgb = ['67,123,168', '146,19,10', '0,118,68', '170,58,211', '255,124,33'];
function getNextColor() { return colors_rgb[nextColor++ % colors_rgb.length]; }

var DEFAULT_OPACITY = 0.5;

window.onload = function() {
   var plotter = window.plotter;
   attachMouseHandlers();
}

function attachMouseHandlers() {
   $('#newcurve').click(function() {
      setupCurveOption();
   });

   var view = document.getElementById("view")
   if (view.addEventListener) {
      view.addEventListener("mousewheel", zoom, false);
      view.addEventListener("DOMMouseScroll", zoom, false);
   }
}

function setupCurveOption() {
   unselectCurve($('#curvelist li.selected'));
   
   // create elements
   var newCurve = $(document.createElement('li'));
   var eqDisp = $(document.createElement('div'));
   var wrap = $(document.createElement('div'));
   var eqEdit = $(document.createElement('input'));
   var color = getNextColor();

   // colors
   newCurve.attr('color', color);
   newCurve.css('border-color', 'rgb(' + color + ')');

   // equation entry and formatting
   eqDisp.hide();
   eqEdit.attr('placeholder', 'enter function');
   eqEdit.keypress(getEquationEnterCallback(eqDisp, eqEdit, newCurve, color));

   eqDisp.dblclick(getEquationEditCallback(eqDisp, eqEdit));
   eqDisp.disableSelection();

   wrap.addClass('wrap')
   wrap.append(eqDisp);
   wrap.append(eqEdit);

   newCurve.click(function(event) {
      var target = $(event.target).closest('#curvelist li');
      selectCurve(target);
   });

   newCurve.append(wrap);
   $('#curvelist').prepend(newCurve);
   eqEdit.focus();
}

function getEquationEnterCallback(dispElem, editElem, listElem, color) {
   return function(event) {
      if (event.which == 13) {
         var formString = editElem.val();
         //try {
            // retrieve, parse, and prettify input equation
            formString = PolySimplifier.preformat(formString);
            var tree = parser.parse(formString);
            console.log("tree: " + tree);
            var coeff = PolySimplifier.reduceToGeneralForm(tree);
            console.log("simplified result: " + coeff);
            var numSamples = degree(coeff) <= 1 ? 10 : undefined;
            editElem.hide();
            dispElem.html(PolySimplifier.coeffToJQMath(coeff));
            dispElem.attr('title', coeff);
            M.parseMath(dispElem[0]);

            // update plotter
            var id;
            if (id = listElem.attr('curveid'))
               plotter.removeCurve(id);

            id = plotter.addCurve(getPolynomialByCoeff(coeff),
                                  'rgb(' + color + ')', numSamples);
            listElem.attr('curveid', id);
            dispElem.show();
            selectCurve(listElem);
         //} catch (err) {
         //   console.log(err);
         //}
      }
   }
}

function getEquationEditCallback(dispElem, inputElem) {
   return function() {
      dispElem.hide();
      inputElem.show();
      inputElem.focus();
   }
}

function selectCurve(listElem) {
   unselectCurve($('#curvelist li.selected'));
   plotter.setActiveCurve(listElem.attr('curveid'));
   listElem.addClass('selected');
   listElem.find('.wrap').css('background-color', 'rgba(' + listElem.attr('color') + ',0.2)');
}

function unselectCurve(listElem) {
   plotter.setActiveCurve(undefined);
   listElem.removeClass('selected');
   listElem.find('.wrap').css('background-color', 'white');
}

function zoom(event) {
   var event = window.event || event; // old IE support
   var dir = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
   plotter.scale(1 + 0.01 * dir);
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

// returns the highest degree of the polynomial coefficient array 'coeff'
function degree(coeff) {
   var last = coeff.length - 1;
   while (!coeff[last] && last >= 0)
      last--;
   return last;
}

(function($){
    $.fn.disableSelection = function() {
        return this
                 .attr('unselectable', 'on')
                 .css('user-select', 'none')
                 .on('selectstart', false);
    };
})(jQuery);