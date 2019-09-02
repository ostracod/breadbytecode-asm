
function ExpressionUtils() {
    
}

var expressionUtils = new ExpressionUtils();

ExpressionUtils.prototype.copyExpressions = function(expressionList) {
    var output = [];
    var index = 0;
    while (index < expressionList.length) {
        var tempExpression = expressionList[index];
        output.push(tempExpression.copy());
        index += 1;
    }
    return output;
}

// processExpression accepts an expression, and returns
// an expression or null. If the output is an expression,
// the output expression replaces the input expression.
// If the output is null, then subexpressions are
// processed recursively. If output is not null and
// shouldRecurAfterProcess is true, then subexpressions
// are also processed recursively.
ExpressionUtils.prototype.processExpressions = function(expressionList, processExpression, shouldRecurAfterProcess) {
    if (typeof shouldRecurAfterProcess === "undefined") {
        shouldRecurAfterProcess = false;
    }
    var index = 0;
    while (index < expressionList.length) {
        var tempExpression = expressionList[index];
        tempExpression = tempExpression.processExpressions(
            processExpression,
            shouldRecurAfterProcess
        );
        expressionList[index] = tempExpression;
        index += 1;
    }
}

module.exports = {
    expressionUtils: expressionUtils
};


