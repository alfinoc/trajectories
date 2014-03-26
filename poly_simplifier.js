/*
   input polynomial tree form (as produced by generated poly_parser):
      - each node is an array, the first element being the type of the node
      - each node corresponds to a valid polynomial
      - there is at one most input variable

   output polynomial form: an array of coefficients, the ith entry in the array
   corresponding to the coefficient of the degree-i term of the polynomial
*/ 

var PolySimplifier = {

   // given a parsed polynomial tree, produces a general representation of that
   // polynomial: an array of coefficients (see above definition for io details)
   reduceToGeneralForm: function(node) {
      switch (node[0]) {
         case "num":
            return [node[1]];
         case "var":
            return [0, 1];
         case "sum":
            var e1 = this.reduceToGeneralForm(node[1]);
            var e2 = this.reduceToGeneralForm(node[2]);
            return this.add(e1, e2);
         case "product":
            console.log("e1: " + e1 + ", e2: " + e2);
            var e1 = this.reduceToGeneralForm(node[1]);
            var e2 = this.reduceToGeneralForm(node[2]);
            return this.multiply(e1, e2);
         case "quotient":
            alert("no division yet!");
            return [];
         case "power":
            var e1 = this.reduceToGeneralForm(node[1]);
            var e2 = this.reduceToGeneralForm(node[2]);
            var res = e1;
            for (var i = 0; i < e2 - 1; i++)
               res = this.multiply(e1, res);
            return res;
         case "negative":
            var e1 = this.reduceToGeneralForm(node[1]);
            for (var i = 0 ; i < e1.length; i++)
               e1[i] = -1 * (e1[i] || 0);
            return e1;
         case "e":
            return [Math.E];
         case "pi":
            return [Math.PI];
      }
   },

   // returns the sum of coefficient-form polys 'e1' and 'e2'
   // note: modifies e1, e2
   add: function(e1, e2) {
      var larger = e1.length > e2.length ? e1 : e2;
      for (var i = 0; i < larger.length; i++)
         larger[i] = (e1[i] || 0) + (e2[i] || 0);
      return larger;
   },

   // returns the product of coefficient-form polys 'e1' and 'e2'
   // note: modifies e1, e2
   multiply: function(e1, e2) {
      var res = [];
      for (var i = 0; i < e1.length; i++) {
         
         // ignore 0 coefficient terms
         if (!e1[i])
            continue;

         // multiply e2 by e1 term coefficient
         var tempExpansion = [];
         for (var j = 0; j < e2.length; j++)
            tempExpansion[j] = (e1[i] || 0) * (e2[j] || 0);

         // multiply e2 by e1 term degree
         var shift = [];
         shift[i - 1] = 0;
         tempExpansion = shift.concat(tempExpansion);

         // add into the cumulative res
         for (var j = 0; j < tempExpansion.length; j++)
            res[j] = (tempExpansion[j] || 0) + (res[j] || 0);
      }
      return res;
   },

   // returns a String representation of the tree with root 'node', in a form
   // readable by jqMath.
   toString: function(node) {

   },

   preformat: function(str) {
      str = str.toLowerCase();
      str = str.replace('pi', '\\pi')
      
   }
}