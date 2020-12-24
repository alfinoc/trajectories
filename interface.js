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

function setupDemoGraph() {
   setupCurveOption();
   $('#curvelist input').val('-x^2+2');
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
   eqEdit.attr('placeholder', 'enter function of x');
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

   // remove button
   var revButt = $('body .remove').clone();
   newCurve.append(revButt);
   revButt.click(getRemoveButtonCallback(newCurve));

   newCurve.append(wrap);
   $('#curvelist').prepend(newCurve);
   eqEdit.focus();
}

function getEquationEnterCallback(dispElem, editElem, listElem, color) {
   return function(event) {
      if (event.which == 13) {
         var formString = editElem.val();
         if (formString.trim() == '')
            return;
         
         try {
            // retrieve and parse
            var tree = parser.parse(formString);
            var eqInfo = EQEvaluator.getEvaluator(tree);
            var numSamples = undefined;
            editElem.hide();
            
            // format according to polynomial / general
            if (eqInfo.coeff) {
               numSamples = PolySimplifier.degree(eqInfo.coeff) <= 1 ? 10 : undefined;
               dispElem.html(PolySimplifier.coeffToJQMath(eqInfo.coeff));
            } else {
               dispElem.html("$$" + EQEvaluator.generalToJQMath(tree) + "$$");
            }
            M.parseMath(dispElem[0]);

            // update plotter
            var id, prevId, prevTrajs;
            if (prevId = listElem.attr('curveid')) { 
               prevTrajs = plotter.getTrajectories(prevId);
               plotter.removeCurve(prevId);
            }

            id = plotter.addCurve(eqInfo.fn, 'rgb(' + color + ')', numSamples);
            
            if (prevTrajs && prevTrajs.length > 0)
               plotter.transferTrajectories(prevTrajs, id);

            listElem.attr('curveid', id);
            dispElem.show();
            selectCurve(listElem);
         } catch (err) {
            console.log(err);
         }
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

function getRemoveButtonCallback(listElem) {
   return function(event) {
      var target = $(event.target).closest('#curvelist li');
      plotter.removeCurve(target.attr('curveid'));
      listElem.remove();
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

function removeCurve(listElem) {
   var id = listElem.attr('curveid');
   plotter.removeCurve(id);
   listElem.remove();
}

function zoom(event) {
   var event = window.event || event; // old IE support
   var dir = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
   plotter.scale(1 + 0.01 * dir);
}

(function($){
    $.fn.disableSelection = function() {
        return this
                 .attr('unselectable', 'on')
                 .css('user-select', 'none')
                 .on('selectstart', false);
    };
})(jQuery);