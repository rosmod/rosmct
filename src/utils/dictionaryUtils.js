/**
 * Utilities for creating openmct dictionaries from a list of ros topics
 * @module dictionaryUtils
 */
/* global require, exports */

var Q = require('q');

    var formatConversionMap = {
        "uint64": "int",
        "int64": "int",
        "uint32": "int",
        "int32": "int",
        "uint16": "int",
        "int16": "int",
        "uint8": "int",
        "int8": "int",

        "float32": "float",
        "float64": "float",

        "byte": "byte",
        "string": "string"
    };



/**
 * Create a dictionary from a ros topics list
 * @param {object} dictInfo information for the root of the new dictionary
 * @param {string} dictInfo.name new dictionary name
 * @param {string} dictInfo.key new dictionary key
 * @param {object} topicInfo topic definition to tranform into dictionary entry
 */
function createDictEntry(dictInfo, topicInfo){
    var self = this
        var topicEntry = {
            name : topicInfo.name,
            key : topicInfo.name,
            values : []
        }
    topicEntry.values = parseDetails(topicInfo.details);
    return topicEntry

/*
    return Q.all(tasks)
        .then(function(topicEntryArray) {
            dict.topic = topicEntryArray;
            fs.writeFileSync('rosDictionary.json', JSON.stringify(dict, null, 2) , 'utf-8');
            return dict;
        });*/

    
}
exports.createDict = createDictEntry

/**
 * Parses message details json from rosbridge into the values objects expected by openmct
 * @param {array} detail array of objects with fieldnames and field datatypes
 * @returns {array} array of openmct value objects
*/
function parseDetails(topicDetails){
    var self = this;
    var parsed = [];


    topicDetails.map(function(detail) {
        for (let i=0; i<detail.fieldtypes.length; i++) {
            var fieldtype = detail.fieldtypes[i];
            var name = detail.fieldnames[i];
            var converted = formatConversionMap[fieldtype];
            if (converted != undefined) {
                var value = {
                    key: name,
                    name: name,
                    units: "None",
                    format: converted,
                    hints: {
                        range: 1
                    }
                };
                parsed.push(value);
            }
        }
    });

    var timeval = {
        key: "utc",
        source: "timestamp",
        name: "Timestamp",
        format: "utc",
        hints: {
            domain: 1
        }
    };
    parsed.push(timeval);

    return parsed;    
}


/**
 * create a composite dictionary from a group of dictionaries
 * @param {object} dictInfo information for the root of the new dictionary
 * @param {string} dictInfo.name new dictionary name
 * @param {string} dictInfo.key new dictionary key
 * @param {array} dicts array of dictionaries to combine 
 */
function groupDicts(dictInfo, dicts){
    var self = this
    
}
exports.groupDicts = groupDicts;
