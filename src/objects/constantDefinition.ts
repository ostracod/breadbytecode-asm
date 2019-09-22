
import {ConstantDefinition as ConstantDefinitionInterface, Identifier, Expression, AssemblyLine} from "models/objects";
import {Assembler} from "objects/assembler";
import {AssemblyError} from "objects/assemblyError";
import {lineUtils} from "utils/lineUtils";

export interface ConstantDefinition extends ConstantDefinitionInterface {}

export class ConstantDefinition {
    constructor(identifier: Identifier, expression: Expression) {
        this.identifier = identifier;
        this.expression = expression;
    }
}

ConstantDefinition.prototype.getDisplayString = function(): string {
    return this.identifier.getDisplayString() + " = " + this.expression.getDisplayString();
}

Assembler.prototype.extractConstantDefinitions = function(lineList: AssemblyLine[]): AssemblyLine[] {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "DEF") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempExpression = tempArgList[1];
            var tempDefinition = new ConstantDefinition(tempIdentifier, tempExpression);
            self.constantDefinitionMap.set(tempIdentifier, tempDefinition);
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

Assembler.prototype.expandConstantInvocations = function(): void {
    var self = this;
    self.processExpressionsInLines(function(expression) {
        var tempIdentifier = expression.evaluateToIdentifierOrNull();
        if (tempIdentifier === null) {
            return null;
        }
        var tempDefinition = self.constantDefinitionMap.get(tempIdentifier);
        if (tempDefinition === null) {
            return null;
        }
        return tempDefinition.expression.copy();
    }, true);
}


