
import {AliasDefinition as AliasDefinitionInterface, Identifier, Expression} from "models/objects";

export interface AliasDefinition extends AliasDefinitionInterface {}

export class AliasDefinition {
    
    constructor(identifier: Identifier, expression: Expression) {
        this.identifier = identifier;
        this.expression = expression;
    }
    
    getDisplayString(): string {
        return this.identifier.getDisplayString() + " = " + this.expression.getDisplayString();
    }
}


