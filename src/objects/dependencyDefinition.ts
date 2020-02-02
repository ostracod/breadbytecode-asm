
import {
    DependencyDefinition as DependencyDefinitionInterface,
    VersionDependencyDefinition as VersionDependencyDefinitionInterface,
    InterfaceDependencyDefinition as InterfaceDependencyDefinitionInterface,
    Identifier, Region
} from "models/objects";
import {niceUtils} from "utils/niceUtils";
import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";

export const DEPENDENCY_MODIFIER = {
    optional: 4,
    implemented: 2,
    guarded: 1
};

var dependencyModifierNameMap = niceUtils.getReverseMap(DEPENDENCY_MODIFIER);

export interface DependencyDefinition extends DependencyDefinitionInterface {}

export class DependencyDefinition extends IndexDefinition {
    constructor(identifier: Identifier, path: string, dependencyModifierList: number[]) {
        super(identifier, indexConstantConverter);
        this.identifier = identifier;
        this.path = path;
        this.dependencyModifierList = dependencyModifierList;
    }
}

DependencyDefinition.prototype.getDisplayString = function(): string {
    let output = this.identifier.getDisplayString() + " = \"" + this.path + "\"";
    let tempTextList = this.dependencyModifierList.map(modifier => {
        return dependencyModifierNameMap[modifier];
    });
    if (tempTextList.length > 0) {
        output += " (" + tempTextList.join(", ") + ")";
    }
    return output;
}

DependencyDefinition.prototype.createRegion = function(): Region {
    // TODO: Implement.
    
    return null;
}


