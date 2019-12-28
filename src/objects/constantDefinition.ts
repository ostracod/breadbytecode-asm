
import {ConstantDefinition as ConstantDefinitionInterface, Identifier, Expression} from "models/objects";

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


