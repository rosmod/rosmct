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
 * Create a dictionary entry from a ros topic
 * @param {object} topicInfo topic definition to tranform into dictionary entry
 * @param {string} topicInfo.name topic name
 * @param {string} topicInfo.type topic type
 * @param {object} topicInfo.details topic type field names and datatypes
 */
function createDictEntry(topicInfo){
    var self = this
    var topicEntry = {
        name : topicInfo.name,
        key : topicInfo.type,
        values : []
    }
    topicEntry.values = parseDetails(topicInfo.details);
    return topicEntry
}

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

    //every entry always has a time value
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
 * Create a dictionary from a set of entries
 * @param {object} dictInfo information for the root of the new dictionary
 * @param {string} dictInfo.name new dictionary name
 * @param {string} dictInfo.key new dictionary key
 * @param {string} dictInfo.membersName the object field to place the array of members
 * @param {array} dictMembers array of dictionary entry objects
 * @return {object} new dictionary object
 */
function createDict(dictInfo, dictMembers){
    var self = this
    var dict = {}
    dict.name = dictInfo.name
    dict.key = dictInfo.key
    dict[dictInfo.membersName] = dictMembers
    return dict
}

exports.createDictEntry = createDictEntry
exports.createDict = createDict

