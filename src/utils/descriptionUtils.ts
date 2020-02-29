
import {DescriptionUtils as DescriptionUtilsInterface} from "models/utils";
import {AssemblyLine, Region} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {REGION_TYPE, AtomicRegion} from "objects/region";

export interface DescriptionUtils extends DescriptionUtilsInterface {}

export class DescriptionUtils {
    
}

export var descriptionUtils = new DescriptionUtils();

DescriptionUtils.prototype.extractDescriptionLine = function(line: AssemblyLine): string {
    if (line.directiveName != "DESC") {
        return null;
    }
    let tempArgList = line.argList;
    if (tempArgList.length !== 1) {
        throw new AssemblyError("Expected 1 argument.");
    }
    return tempArgList[0].evaluateToString();
}

DescriptionUtils.prototype.createDescriptionRegion = function(descriptionLineList: string[]): Region {
    if (descriptionLineList.length <= 0) {
        return null
    }
    return new AtomicRegion(
        REGION_TYPE.desc,
        Buffer.from(descriptionLineList.join("\n"))
    );
}


