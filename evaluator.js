/*
   input equation tree form (as produced by generated parser):
      - each node is an array, the first element being the type of the node
      - each node corresponds to a valid expression (see parser)
      - there is at one most input variable

   output evaluator form: a function of a single variable. contains nested
   functions for each nested expression, so don't go crazy.
*/

var EQEvaluator = {
   // returns an information object, the principal field of which is 'fn', the
   // single-variable function that evaluates x -> y. also includes a 'coeff'
   // field with the polynomial representation of the function.
   getEvaluator: function(node) {
      var info = {};
      if (this.isPolynomial(node)) {
         var coeff = PolySimplifier.reduceToGeneralForm(node);
         info.fn = PolySimplifier.getPolynomialByCoeff(coeff);
         info.coeff = coeff;
         console.log("polynomial!");
      } else {
         info.fn = this.getGeneralEvaluator(node);
         console.log("general equation!");
      }
      return info;
   },

   // given a parsed expression tree, returns a function of a single variable
   // that will evaluate the expression at that single value when called
   getGeneralEvaluator: function(node) {
      switch (node[0]) {
         case "num":
            return function(x) { return node[1] };
         case "var":
            return function(x) { return x };
         case "sum":
            var e1 = this.getGeneralEvaluator(node[1]);
            var e2 = this.getGeneralEvaluator(node[2]);
            return function(x) { return e1(x) + e2(x)};
         case "product":
            var e1 = this.getGeneralEvaluator(node[1]);
            var e2 = this.getGeneralEvaluator(node[2]);
            return function(x) { return e1(x) * e2(x)};
         case "quotient":
            var e1 = this.getGeneralEvaluator(node[1]);
            var e2 = this.getGeneralEvaluator(node[2]);
            return function(x) { return e1(x) / e2(x)};
         case "power":
            var e1 = this.getGeneralEvaluator(node[1]);
            var e2 = this.getGeneralEvaluator(node[2]);
            return function(x) {
               var base = e1(x);
               var exp = e2(x);
               return Math.pow(base, exp);
            }
         case "negative":
            var e1 = this.getGeneralEvaluator(node[1]);
            return function(x) { return - e1(x) };
         case "e":
            return function(x) { return Math.E };
         case "pi":
            return function(x) { return Math.PI };
      }
   },

   // returns false if the expression tree 'node' is not a valid polynomial.
   // returns true somewhat conservatively, but for most polynomials. details
   // are not complicated, so look below.
   isPolynomial: function(node) {
      switch (node[0]) {
         case "quotient":
            if (node[2][0] != "num")  // require constant denominator
               return false;
            return this.isPolynomial(node[1]);
         case "power":
            if (node[2][0] != "num")  // require constant exponent
               return false;
            return this.isPolynomial(node[1]);
         case "sum":
         case "product":
            return this.isPolynomial(node[1]) && this.isPolynomial(node[2]);
         case "negative":
            return this.isPolynomial(node[1]);
         case "num":
         case "var":
         case "e":
         case "pi":
            return true;
      }
   },

}

/*
   input polynomial tree form (as produced by generated parser):
      - each node is an array, the first element being the type of the node
      - each node corresponds to a valid polynomial
      - there is at one most input variable

   output polynomial form: an array of coefficients, the ith entry in the array
   corresponding to the coefficient of the degree-i term of the polynomial
*/

var PolySimplifier = {

   // given a parsed polynomial tree, produces a general representation of that
   // polynomial: an array of coefficients (see above definition for io details)
   // assumes that 'node' is a polynomial by the specifications of 'isPolynomial'
   // above. otherwise, all bets are off.
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
            var e1 = this.reduceToGeneralForm(node[1]);
            var e2 = this.reduceToGeneralForm(node[2]);
            return this.multiply(e1, e2);
         case "quotient":
            var e1 = this.reduceToGeneralForm(node[1]);
            return this.multiply(e1, [1 / node[2][1]]);
         case "power":
            var e1 = this.reduceToGeneralForm(node[1]);
            var e2 = this.reduceToGeneralForm(node[2]);
            var res = [1];

            for (var i = 0; i < e2; i++)
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
   coeffToJQMath: function(coeff) {
      console.log(coeff);
      var termStrs = [];
      for (var deg = coeff.length - 1; deg >= 0; deg--) {
         if (coeff[deg]) {
            var term = "";

            if (coeff[deg] < 0)
               term += '-';
            if (Math.abs(coeff[deg]) != 1 || deg == 0)
               term += this.rationalize(Math.abs(coeff[deg]));

            if (deg != 0)
               term += 'x';
            
            if (deg > 1)
               term +=  '^' + deg;
            
            termStrs.push(term);
         }
      }

      if (termStrs.length == 0)
         return "$$0$$";
      var res = "$$" + termStrs[0];
      for (var i = 1; i < termStrs.length; i++) {
         res += termStrs[i][0] == '-' ? '' : '+';
         res += termStrs[i];
      }
      return res + "$$";
   },

   // returns a polynomial function based on 'coeff' an array of coefficients, the
   // ith index of which is the coefficient for the term of exponent i in the polynomial
   getPolynomialByCoeff: function(coeff) {
      return function(x) {
         var val = 0;
         for (var i = 0; i < coeff.length; i++)
            val += coeff[i] * Math.pow(x, i);
         return val;
      }
   },

   // returns a polynomial function based on 'zeros' an array of zeros, where each
   // zero z corresponds to a (x - z) factor in the polynomial
   getPolynomialByZeros: function(zeros) {
      return function(x) {
         var val = 1;
         for (var i = 0; i < zeros.length; i++)
            val *= (x - zeros[i]);
         return val;
      }
   },

   // returns the highest degree of the polynomial coefficient array 'coeff'
   degree: function(coeff) {
      var last = coeff.length - 1;
      while (!coeff[last] && last >= 0)
         last--;
      return last;
   },

   // returns a string fraction i/j, where i and j are integers and 
   // i/j = n +- tolerance, or, if it can't find such a fraction (only checks
   // denominators up to 100), returns n.
   rationalize: function(n, tolerance) {
      tolerance = tolerance || 0.0001;
      if (Math.abs(n - Math.round(n)) < tolerance)
         return n;
      for (var d = 2; d < 100; d++)
         if (Math.abs(n * d - Math.round(n * d)) < tolerance)
            return n * d + '/' + d;
      return n;
   }
}