
import {
    DependencyDefinition as DependencyDefinitionInterface,
    VersionDependencyDefinition as VersionDependencyDefinitionInterface,
    InterfaceDependencyDefinition as InterfaceDependencyDefinitionInterface,
    Identifier, Region, VersionNumber, Expression
} from "models/objects";

import {niceUtils} from "utils/niceUtils";

import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";
import {REGION_TYPE, AtomicRegion, CompositeRegion} from "objects/region";

export const DEPENDENCY_MODIFIER = {
    optional: 4,
    implemented: 2,
    guarded: 1
};

var dependencyModifierNameMap = niceUtils.getReverseMap(DEPENDENCY_MODIFIER);

export interface DependencyDefinition extends DependencyDefinitionInterface {}

export abstract class DependencyDefinition extends IndexDefinition {
    constructor(
        regionType: number,
        identifier: Identifier,
        path: string,
        dependencyModifierList: number[]
    ) {
        super(identifier, indexConstantConverter);
        this.regionType = regionType;
        this.identifier = identifier;
        this.path = path;
        this.dependencyModifierList = dependencyModifierList;
    }
}

DependencyDefinition.prototype.getDisplayString = function(): string {
    let output = this.identifier.getDisplayString() + " = \"" + this.path + "\"";
    let tempText = this.getDisplayStringHelper();
    if (tempText !== null) {
        output += ", " + tempText;
    }
    let tempTextList = this.dependencyModifierList.map(modifier => {
        return dependencyModifierNameMap[modifier];
    });
    if (tempTextList.length > 0) {
        output += " (" + tempTextList.join(", ") + ")";
    }
    return output;
}

DependencyDefinition.prototype.createRegion = function(): Region {
    let tempAttributesBitfield = 0;
    for (let modifier of this.dependencyModifierList) {
        tempAttributesBitfield |= modifier;
    }
    let attributesRegion = new AtomicRegion(
        REGION_TYPE.depAttrs,
        Buffer.from([tempAttributesBitfield])
    );
    let pathRegion = new AtomicRegion(REGION_TYPE.path, Buffer.from(this.path));
    let tempRegionList = [
        attributesRegion,
        pathRegion
    ].concat(this.createRegionHelper());
    return new CompositeRegion(this.regionType, tempRegionList);
}

DependencyDefinition.prototype.getDisplayStringHelper = function(): string {
    return null;
}

DependencyDefinition.prototype.createRegionHelper = function(): Region[] {
    return [];
}

export class PathDependencyDefinition extends DependencyDefinition {
    constructor(identifier: Identifier, path: string, dependencyModifierList: number[]) {
        super(REGION_TYPE.pathDep, identifier, path, dependencyModifierList);
    }
}

export interface VersionDependencyDefinition extends VersionDependencyDefinitionInterface {}

export class VersionDependencyDefinition extends DependencyDefinition {
    constructor(
        identifier: Identifier,
        path: string,
        versionNumber: VersionNumber,
        dependencyModifierList: number[]
    ) {
        super(REGION_TYPE.verDep, identifier, path, dependencyModifierList);
        this.versionNumber = versionNumber;
    }
}

VersionDependencyDefinition.prototype.getDisplayStringHelper = function(): string {
    return this.versionNumber.getDisplayString();
}

VersionDependencyDefinition.prototype.createRegionHelper = function(): Region[] {
    let versionRegion = new AtomicRegion(
        REGION_TYPE.depVer,
        this.versionNumber.createBuffer()
    );
    return [versionRegion];
}

export interface InterfaceDependencyDefinition extends InterfaceDependencyDefinitionInterface {}

export class InterfaceDependencyDefinition extends DependencyDefinition {
    constructor(
        identifier: Identifier,
        path: string,
        dependencyExpressionList: Expression[],
        dependencyModifierList: number[]
    ) {
        super(REGION_TYPE.ifaceDep, identifier, path, dependencyModifierList);
        this.dependencyExpressionList = dependencyExpressionList;
    }
}

InterfaceDependencyDefinition.prototype.getDisplayStringHelper = function(): string {
    if (this.dependencyExpressionList.length <= 0) {
        return null;
    }
    return this.dependencyExpressionList.map(expression => {
        return expression.getDisplayString()
    }).join(", ");
}

InterfaceDependencyDefinition.prototype.createRegionHelper = function(): Region[] {
    let tempBuffer = Buffer.alloc(this.dependencyExpressionList.length * 4);
    for (let index = 0; index < this.dependencyExpressionList.length; index++) {
        let tempExpression = this.dependencyExpressionList[index];
        let tempIndex = tempExpression.evaluateToNumber();
        tempBuffer.writeUInt32LE(tempIndex, index * 4);
    }
    let indexesRegion = new AtomicRegion(REGION_TYPE.depIndexes, tempBuffer);
    return [indexesRegion];
}


