
import {
    Scope as ScopeInterface,
    IdentifierMap, IndexDefinition, Identifier, PublicFunctionDefinition
} from "models/objects";

export interface Scope extends ScopeInterface {}

export class Scope {
    
    constructor(parentScope?: Scope) {
        this.indexDefinitionMapList = null;
        this.publicFunctionDefinitionList = null;
        if (typeof parentScope === "undefined") {
            this.parentScope = null;
        } else {
            this.parentScope = parentScope;
        }
    }
    
    getIndexDefinitionByIdentifier(identifier: Identifier): IndexDefinition {
        for (let identifierMap of this.indexDefinitionMapList) {
            let tempDefinition = identifierMap.get(identifier);
            if (tempDefinition !== null) {
                return tempDefinition;
            }
        }
        if (this.parentScope === null) {
            return null;
        } else {
            return this.parentScope.getIndexDefinitionByIdentifier(identifier);
        }
    }
    
    getPublicFunctionDefinition(
        identifier: Identifier,
        interfaceIndex: number
    ): PublicFunctionDefinition {
        if (this.publicFunctionDefinitionList !== null) {
            for (let functionDefinition of this.publicFunctionDefinitionList) {
                let tempExpression = functionDefinition.interfaceIndexExpression;
                if (identifier.equals(functionDefinition.identifier)
                        && interfaceIndex === tempExpression.evaluateToNumber()) {
                    return functionDefinition;
                }
            }
        }
        if (this.parentScope === null) {
            return null;
        } else {
            return this.parentScope.getPublicFunctionDefinition(identifier, interfaceIndex);
        }
    }
}


