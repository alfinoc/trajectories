var nextColor = 0;
var colors = ['#437BA8', '#92130A', '#007644', '#AA3AD3', '#FF7C21'];
var colors_rgb = ['67,123,168', '146,19,10', '0,118,68', '170,58,211', '255,124,33'];
function getNextColor() { return colors_rgb[nextColor++ % colors_rgb.length]; }

var DEFAULT_OPACITY = 0.5;

window.onload = function() {
   var ViewManager = window.ViewManager;
   attachCurveListHandlers();
	//var cubic = ViewManager.addCurve(getPolynomialByZeros([0, 1, -1]), 'red');
	//var quad =  ViewManager.addCurve(getPolynomialByCoeff([2, 0, -1]), 'black');
	//var line =  ViewManager.addCurve(getPolynomialByZeros([0]), 'blue', 10);
	//ViewManager.addTrajectory(quad, 1.2);
}

function attachCurveListHandlers() {
   $('#newcurve').click(function() {
      setupCurveOption();
   });
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
   eqEdit.keypress(getEquationEnterCallback(eqDisp, eqEdit, color));

   eqDisp.dblclick(getEquationEditCallback(eqDisp, eqEdit));
   eqDisp.disableSelection();

   wrap.addClass('wrap')
   wrap.append(eqDisp);
   wrap.append(eqEdit);

   newCurve.click(function(event) {
      var target = $(event.target).closest('#curvelist li');
      if (target.hasClass('selected')) {
         unselectCurve(target);
      } else {
         selectCurve(target);
      }
   });

   newCurve.append(wrap);
   $('#curvelist').prepend(newCurve);
   selectCurve(newCurve);3
   eqEdit.focus();
}

function getEquationEnterCallback(dispElem, editElem, color) {
   return function(event) {
      if (event.which == 13) {
         var formString = editElem.val();
         editElem.hide();
         dispElem.html('$$' + formString + '$$');
         M.parseMath(dispElem[0]);
         ViewManager.addCurve(getPolynomialByZeros([0, 1, -1]), 'rgb(' + color + ')');
         dispElem.show();
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
   listElem.addClass('selected');
   listElem.find('.wrap').css('background-color', 'rgba(' + listElem.attr('color') + ',0.2)');
}

function unselectCurve(listElem) {
   listElem.removeClass('selected');
   listElem.find('.wrap').css('background-color', 'white');
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

(function($){
    $.fn.disableSelection = function() {
        return this
                 .attr('unselectable', 'on')
                 .css('user-select', 'none')
                 .on('selectstart', false);
    };
})(jQuery);