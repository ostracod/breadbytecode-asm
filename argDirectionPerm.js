
var AssemblyError = require("./assemblyError").AssemblyError;

var PERM_ACCESS = {
    read: 0,
    write: 1,
    sentryType: 2
};

var PERM_DIRECTION = {
    input: 0,
    output: 1
};

var PERM_ATTRIBUTE = {
    isRecursive: 0,
    propagationCountIsInfinite: 1,
    isTemporary: 2
};

var characterAccessMap = {
    r: PERM_ACCESS.read,
    w: PERM_ACCESS.write,
    s: PERM_ACCESS.sentryType
}

var characterDirectionMap = {
    i: PERM_DIRECTION.input,
    o: PERM_DIRECTION.output
}

var characterAttributeMap = {
    r: PERM_ATTRIBUTE.isRecursive,
    p: PERM_ATTRIBUTE.propagationCountIsInfinite,
    t: PERM_ATTRIBUTE.isTemporary
}

function getReverseMap(map) {
    var output = {};
    var key;
    for (key in map) {
        var tempValue = map[key];
        output[tempValue] = key;
    }
    return output;
}

// Maps from enumeration value to character.
var accessCharacterMap = getReverseMap(characterAccessMap);
var directionCharacterMap = getReverseMap(characterDirectionMap);
var attributeCharacterMap = getReverseMap(characterAttributeMap);

function ArgDirectionPerm(name) {
    if (name.length < 2) {
        throw new AssemblyError("Invalid arg direction perm.");
    }
    var tempCharacter = name.charAt(0);
    if (!(tempCharacter in characterAccessMap)) {
        throw new AssemblyError("Invalid arg direction perm.");
    }
    this.access = characterAccessMap[tempCharacter];
    var tempCharacter = name.charAt(1);
    if (!(tempCharacter in characterDirectionMap)) {
        throw new AssemblyError("Invalid arg direction perm.");
    }
    this.direction = characterDirectionMap[tempCharacter];
    // Map from attribute enumeration value to boolean.
    this.attributeMap = {};
    var attributeName;
    for (attributeName in PERM_ATTRIBUTE) {
        var tempAttribute = PERM_ATTRIBUTE[attributeName];
        this.attributeMap[tempAttribute] = false;
    }
    var index = 2;
    while (index < name.length) {
        var tempCharacter = name.charAt(index);
        if (tempCharacter in characterAttributeMap) {
            var tempAttribute = characterAttributeMap[tempCharacter];
            this.attributeMap[tempAttribute] = true;
        } else {
            throw new AssemblyError("Invalid arg direction perm.");
        }
        index += 1;
    }
}

ArgDirectionPerm.prototype.toString = function() {
    var output = accessCharacterMap[this.access] + directionCharacterMap[this.direction];
    var attribute;
    for (attribute in this.attributeMap) {
        if (this.attributeMap[attribute]) {
            output = output + attributeCharacterMap[attribute];
        }
    }
    return output;
}

ArgDirectionPerm.prototype.merge = function(directionPerm) {
    var attribute;
    for (attribute in directionPerm.attributeMap) {
        if (directionPerm.attributeMap[attribute]) {
            this.attributeMap[attribute] = true;
        }
    }
}

module.exports = {
    ArgDirectionPerm: ArgDirectionPerm,
    PERM_ACCESS: PERM_ACCESS,
    PERM_DIRECTION: PERM_DIRECTION,
    PERM_ATTRIBUTE: PERM_ATTRIBUTE
};


