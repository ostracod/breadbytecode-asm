
function Identifier(name, macroInvocationId) {
    // TODO: Make sure that name contains valid characters.
    this.name = name;
    this.macroInvocationId = macroInvocationId;
}

Identifier.prototype.toString = function() {
    if (this.macroInvocationId === null) {
        return this.name;
    }
    return "@{" + this.macroInvocationId + "}" + this.name;
}

Identifier.prototype.getMapKey = function() {
    if (this.macroInvocationId === null) {
        return this.name;
    }
    return this.name + " " + this.macroInvocationId;
}

function IdentifierMap() {
    this.map = {};
}

IdentifierMap.prototype.get = function(identifier) {
    var tempKey = identifier.getMapKey();
    if (tempKey in this.map) {
        return this.map[tempKey];
    } else {
        return null;
    }
}

IdentifierMap.prototype.set = function(identifier, value) {
    var tempKey = identifier.getMapKey();
    this.map[tempKey] = value;
}

IdentifierMap.prototype.iterate = function(handle) {
    var key;
    for (key in this.map) {
        handle(this.map[key]);
    }
}

module.exports = {
    Identifier: Identifier,
    IdentifierMap: IdentifierMap
};


