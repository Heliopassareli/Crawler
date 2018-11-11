var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');

let getNewsUrl = () => {
    request
    .get('https://br.investing.com/news/forex-news/').on('response', function(response){
        
        console.log(response);
    });
}

getNewsUrl();