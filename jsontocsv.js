#!/usr/bin/env node
var path = require('path'),
    pkg = require(path.join(__dirname, 'package.json')),
    program = require('commander'),
    fs = require('fs'),
    jsonSchemaGenerator = require('json-schema-generator');
var data = '';
var headers = [];
var prefixes = [];
var readStream;

program
    .version(pkg.version)
    .option('-i, --input <input>', 'json file to process')
    .option('-o, --output <output>', 'name of the csv file to output after conversion')
    .parse(process.argv);
readStream = fs.createReadStream(path.join(__dirname, program.input));

var getHeaders = function(obj) {
    for (property in obj)
    {
        if(obj[property].type == "array") {
            prefixes.push(property.toString());
            getHeaders(obj[property]["items"]["properties"]);
        }
        else if (obj[property].type == "object") {
            prefixes.push(property.toString());
            getHeaders(obj[property]["properties"]);
        }
        else {
            var columnName = '';
            for (var i = 0; i < prefixes.length ; i++)
            {
                columnName += prefixes[i] + "_";
            }
            columnName += property.toString();
            headers.push(columnName.trim());
        }
    }
    prefixes = [];
};

var getValues = function(obj) {
    //walk through each object and get the values.
    //need to parse column names as needed
    //add them to an array of comma separated values

};

readStream
    .on('data', function (chunk) {
        data += chunk;
    })
    .on('end', function(err) {
        var json_data = JSON.parse(data);
        var schemaObj = jsonSchemaGenerator(json_data);
        getHeaders(schemaObj["items"]["properties"]);
        console.log(headers);
    })
    .on('error', function(err) {
        console.log(err);
    });
