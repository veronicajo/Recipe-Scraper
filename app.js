const express = require('express');
const app = express(); 
app.use(express.json());
app.use(express.urlencoded({extended: false}));

const axios = require('axios');
const cheerio = require('cheerio');
     
app.set('port', 8402);


/*
    FUNCTIONS
*/

function convertString(str) {
    if (str == '¼') {
        return 0.25
    } else if (str == '½') {
        return 0.5
    }else if (str == '¾') {
        return 0.75
    } else {
        return parseInt(str)
    }
}

function cleanUpData(strIngredients) {
    const measuringUnits = ['teaspoon', 'teaspoons', 'tablespoon', 'tablespoons', 'cup', 'cups', 'oz', 'ounces', 'pound', 'pounds', 'lb', 'lbs']
    const fractions = ['¼', '½', '¾']

    const parsedArray = [];

    for (var i = 0; i < strIngredients.length; i++){
        var tempArr = strIngredients[i].split(" ")
        var tempDict = {};

        for (var j = 0; j < tempArr.length; j++) {
            if (j == 0 || fractions.includes(tempArr[j])) {
                var value = convertString(tempArr[j])

                if ('amount' in tempDict) {
                    tempDict['amount'] += value;
                } else {
                    tempDict['amount'] = value;
                }
            } else if (measuringUnits.includes(tempArr[j])){
                tempDict['measureUnits'] = tempArr[j]
            } else if (tempArr[j] !== ' ') {
                if ('ingredient' in tempDict) {
                    tempDict['ingredient'] = tempDict['ingredient'] + ' ' + tempArr[j]
                } else {
                    tempDict['ingredient'] = tempArr[j]
                }
            }
        }
        parsedArray.push(tempDict);
    }
    strIngredients.push(parsedArray);
}

/*
    ROUTES
*/

app.get('/', (req, res) => {
    const recipeUrl = req.query.url;

    axios(recipeUrl)
    .then(response => {
        const html = response.data;
        const $ = cheerio.load(html);
        const obj = $('[type=application/ld+json]')
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (obj[0] == undefined) {
            res.send({error: "Bad URL."})
        } else {
            const metadata = JSON.parse(obj[0].children[0].data);

            if (metadata[1] !== undefined) {
                var strIngredients = metadata[1]['recipeIngredient'];
            } else {
                var strIngredients = metadata['recipeIngredient'];
            }
            cleanUpData(strIngredients)
            res.send(strIngredients)
        }
    })
    .catch(console.error);
  });

function errorHandler (err, req, res, next) {
    if (res.headersSent) {
      return next(err)
    }
    res.status(500)
    res.send('error', { error: err })
  }

  
/*
    LISTENER
*/
app.listen(app.get('port'), function(){
    console.log(`Express started on http://${process.env.HOSTNAME}:${app.get('port')}; press Ctrl-C to terminate.`);
  });