#!/usr/bin/env node
var path = require('path'),
    pkg = require(path.join(__dirname, 'package.json')),
    program = require('commander'),
    fs = require('fs'),
    jsonSchemaGenerator = require('json-schema-generator');
var data = '';
var columnNames = [];
var csvRows = [];
var prefixes = [];
var readStream;

program
    .version(pkg.version)
    .option('-i, --input <input>', 'json file to process')
    .option('-o, --output <output>', 'name of the csv file to output after conversion')
    .parse(process.argv);
readStream = fs.createReadStream(path.join(__dirname, program.input));

function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
}

function isObject(what) {
    return Object.prototype.toString.call(what) === "[object Object]";
}

var getColumnNames = function(obj) {
    for (var property in obj)
    {
        if(obj[property].type == "array") {
            prefixes.push(property.toString());
            getColumnNames(obj[property]["items"]["properties"]);
        }
        else if (obj[property].type == "object") {
            prefixes.push(property.toString());
            getColumnNames(obj[property]["properties"]);
        }
        else {
            var columnName = '';
            for (var i = 0; i < prefixes.length ; i++)
            {
                columnName += prefixes[i] + "_";
            }
            columnName += property.toString();
            columnNames.push(columnName.trim());
        }
    }
    prefixes = [];
};

var getValue = function(obj) {
    //TODO
    return "";

};

var addCsvRow = function(dataRow) {
    //walk through each object and get the values.
    //need to parse column names as needed
    //add them to an array of comma separated values
    //when you encounter arrays, create a value string with ";" separated values.

    var csvRow = "";

    for(var i = 0; i < columnNames.length; i++)
    {
        var words = columnNames[i].split("_");
        var value;

        for (var j = 0; j < words.length; j++)
        {
            if (!(words[j] in dataRow) && (words[j] === words[words.length-1]))
            {
                value = "";
                break;
            }
            else
            {
                if (isArray(dataRow[words[j]]))
                {
                    var innerValuesCount = dataRow[words[j]].length;
                    //construct '|' separate value string TODO
                    value = getValue(dataRow[words[j]])
                    break;

                }
                else if (isObject(dataRow[words[j]]))
                {
                    //addCsvRow(dataRow[words[j]]);
                    if (isArray(dataRow[words[j]][words[j+1]]))
                    {
                        var innerValuesCount = dataRow[words[j]][words[j+1]].length;
                        //construct '|' separate value string TODO
                        value = getValue(dataRow[words[j]]);
                        break;
                    }
                }
                else
                {
                    value = dataRow[words[j]];
                    break;
                }
            }
        }

        if(dataRow[columnNames[i]] != undefined)
        {
            if (i === columnNames.length-1)
                csvRow += dataRow[columnNames[i]];
            else
                csvRow += dataRow[columnNames[i]] + ",";
        }
        else
        {
            if (i === columnNames.length-1)
                csvRow += "";
            else
                csvRow += ",";
        }
    }
    csvRows.push(csvRow);
};

readStream
    .on('data', function (chunk) {
        data += chunk;
    })
    .on('end', function(err) {
        var jsonData = JSON.parse(data);
        var schemaObj = jsonSchemaGenerator(jsonData);
        getColumnNames(schemaObj["items"]["properties"]);
        for (var i = 0; i < jsonData.length; i++)
        {
            addCsvRow(jsonData[i]);
        }
        console.log(columnNames);
    })
    .on('error', function(err) {
        console.log(err);
    });
