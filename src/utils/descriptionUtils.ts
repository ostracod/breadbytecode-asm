
import {DescriptionUtils as DescriptionUtilsInterface} from "models/utils";
import {AssemblyLine, Region} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {REGION_TYPE, AtomicRegion} from "objects/region";

export interface DescriptionUtils extends DescriptionUtilsInterface {}

export class DescriptionUtils {
    
    extractDescriptionLine(line: AssemblyLine): string {
        if (line.directiveName !== "DESC") {
            return null;
        }
        let tempArgList = line.argList;
        if (tempArgList.length !== 1) {
            throw new AssemblyError("Expected 1 argument.");
        }
        return tempArgList[0].evaluateToString();
    }
    
    createDescriptionRegion(descriptionLineList: string[]): Region {
        if (descriptionLineList.length <= 0) {
            return null
        }
        return new AtomicRegion(
            REGION_TYPE.desc,
            Buffer.from(descriptionLineList.join("\n"))
        );
    }
}

export const descriptionUtils = new DescriptionUtils();


