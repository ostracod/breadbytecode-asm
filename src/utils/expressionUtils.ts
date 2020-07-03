
import {ExpressionProcessor} from "models/items";
import {ExpressionUtils as ExpressionUtilsInterface} from "models/utils";
import {Expression} from "models/objects";

export interface ExpressionUtils extends ExpressionUtilsInterface {}

export class ExpressionUtils {
    
    copyExpressions(expressionList: Expression[]): Expression[] {
        return expressionList.map(expression => expression.copy());
    }
    
    // processExpression accepts an expression, and returns
    // an expression or null. If the output is an expression,
    // the output expression replaces the input expression.
    // If the output is null, then subexpressions are
    // processed recursively. If output is not null and
    // shouldRecurAfterProcess is true, then subexpressions
    // are also processed recursively.
    processExpressions(
        expressionList: Expression[],
        processExpression: ExpressionProcessor,
        shouldRecurAfterProcess?: boolean
    ): void {
        if (typeof shouldRecurAfterProcess === "undefined") {
            shouldRecurAfterProcess = false;
        }
        for (let index = 0; index < expressionList.length; index++) {
            let tempExpression = expressionList[index];
            tempExpression = tempExpression.processExpressions(
                processExpression,
                shouldRecurAfterProcess
            );
            expressionList[index] = tempExpression;
        }
    }
}

export var expressionUtils = new ExpressionUtils();


