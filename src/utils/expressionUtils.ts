
import {ExpressionProcessor} from "models/items";
import {ExpressionUtils as ExpressionUtilsInterface} from "models/utils";
import {Expression} from "models/objects";

export interface ExpressionUtils extends ExpressionUtilsInterface {}

export class ExpressionUtils {
    
}

export var expressionUtils = new ExpressionUtils();

ExpressionUtils.prototype.copyExpressions = function(expressionList: Expression[]): Expression[] {
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
ExpressionUtils.prototype.processExpressions = function(
    expressionList: Expression[],
    processExpression: ExpressionProcessor,
    shouldRecurAfterProcess?: boolean
): void {
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


